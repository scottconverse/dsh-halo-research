"""Run Halo's saved Strata configuration with a bounded, owned process tree."""
import argparse
from contextlib import ExitStack
from hashlib import sha256
import json
import msvcrt
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.request

import psutil

from settings import HERE, MODEL, NO_WINDOW, settings
from windows_memory import cap_working_set, free_gib, commit_free_gib

CONFIG = settings('halo')
TERMINAL = Path(CONFIG['terminal'])
ENGINE = Path(CONFIG['engine'])
STATE = HERE / 'halo-state.json'

STARTUP_SECONDS = 480
LEASE_SECONDS = 1800
CAPPED_CONFIG = Path(CONFIG['cappedConfig'])
CAPPED_CONFIG_HASH = CONFIG['cappedConfigSHA256'].lower()
CAPPED_PORT = 8083
CAPPED_WORKING_SET_GIB = 20
CAPPED_PREFETCH_SLOTS = 10701
PREFETCH_PYTHON = Path(CONFIG['prefetchPython'])
PREFETCH_TIMEOUT_SECONDS = 125


def preflight(capped=False):
    if capped:
        evidence = CAPPED_CONFIG.read_bytes()
        if sha256(evidence).hexdigest() != CAPPED_CONFIG_HASH:
            raise RuntimeError('The tested capped Strata configuration has changed')
        config = json.loads(evidence)
        if config['args'][config['args'].index('--max-context') + 1] not in ('32768', 32768):
            raise RuntimeError('The capped configuration must use a 32,768-token context')
    else:
        config = json.loads(Path(CONFIG['fullConfig']).read_text(encoding='utf-8-sig'))
    source_port = 18181 if capped else 8081
    if (config.get('host'), config.get('port'), config.get('model_name')) != ('127.0.0.1', source_port, MODEL):
        raise RuntimeError('Saved Halo Strata configuration has an unexpected endpoint or model')
    paths = [ENGINE, TERMINAL / 'python/python.exe', Path(config['cwd']), Path(config['tokenizer'])]
    asset_flags = ['--pack', '--native', '--ple-gguf', '--expert-profile']
    if not capped:
        asset_flags.append('--mtp')
    for flag in asset_flags:
        paths.append(Path(config['args'][config['args'].index(flag) + 1]))
    if not all(path.exists() for path in paths):
        raise RuntimeError('A saved Halo Strata asset is missing')
    with socket.socket() as port:
        port.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        port.bind(('127.0.0.1', CAPPED_PORT if capped else 8081))
    existing = [proc for proc in psutil.process_iter(['name']) if (proc.info['name'] or '').lower() == 'strata.exe']
    if existing:
        raise RuntimeError('Halo already has a Strata engine process outside this controller')
    ram, commit = free_gib(), commit_free_gib()
    # The capped run consumed ~22.2 GiB RAM and ~29.0 GiB commit in the saved
    # samples. Reserve the same runtime floors plus additional startup margin.
    min_ram, min_commit = (32, 38) if capped else (20, 56)
    if ram < min_ram or commit < min_commit:
        raise RuntimeError(f'Halo Strata needs at least {min_ram} GiB free RAM and {min_commit} GiB free commit for this profile. Available: {ram:.1f} GiB RAM and {commit:.1f} GiB commit.')
    return config, ram, commit


def health(port):
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/health', timeout=2) as result:
            return json.load(result).get('status') == 'ok'
    except (OSError, ValueError):
        return False


def prefetch_capped():
    helper = HERE / 'prefetch_halo_experts.py'
    with (HERE / 'halo-strata-capped.prefetch.log').open('w', encoding='utf-8') as log:
        result = subprocess.run(
            [str(PREFETCH_PYTHON), '-B', str(helper), str(CAPPED_PREFETCH_SLOTS)],
            stdout=log, stderr=log, creationflags=NO_WINDOW, timeout=PREFETCH_TIMEOUT_SECONDS,
        )
    if result.returncode:
        raise RuntimeError('Capped Strata expert prefetch failed; see halo-strata-capped.prefetch.log')


def publish(state, record, status, **fields):
    record.update(status=status, **fields)
    pending = state.with_suffix('.tmp')
    pending.write_text(json.dumps(record), encoding='utf-8')
    pending.replace(state)


def start(capped=False):
    port = CAPPED_PORT if capped else 8081
    state = HERE / 'halo-capped-state.json' if capped else STATE
    prefix = 'halo-strata-capped' if capped else 'halo-strata'
    with ExitStack() as locks:
        route_lock = locks.enter_context((HERE / f'{prefix}.lock').open('a+b'))
        try:
            msvcrt.locking(route_lock.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            return
        lock = locks.enter_context((HERE / 'halo-worker.lock').open('a+b'))
        try:
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError as error:
            message = 'The other Halo Strata auto-start route is already running or starting.'
            publish(state, {'started': time.time()}, 'error', error=message)
            raise RuntimeError(message) from error
        record = {'started': time.time(), 'maxSeconds': LEASE_SECONDS}
        process = None
        children = {}
        publish(state, record, 'starting')
        try:
            config, ram, commit = preflight(capped)
            if capped:
                prefetch_capped()
                config, ram, commit = preflight(capped)
            config.update(exe=str(ENGINE), port=port, open_browser=False, engine_ready_s=STARTUP_SECONDS,
                          log=str(HERE / f'{prefix}.engine.log'))
            launch = HERE / f'{prefix}.launch.json'
            launch.write_text(json.dumps(config), encoding='utf-8')
            cmd = [str(TERMINAL / 'python/python.exe'), '-B', '-m', 'serve.server',
                   '--engine', 'strata', '--host', '127.0.0.1', '--port', str(port),
                   '--config', str(launch), '--parallel', '1', '--offline']
            with (HERE / f'{prefix}.server.log').open('w', encoding='utf-8') as log:
                process = subprocess.Popen(cmd, cwd=TERMINAL, env=os.environ.copy(),
                                           stdout=log, stderr=log, creationflags=NO_WINDOW)
                owner = psutil.Process(process.pid)
                record['pid'] = owner.pid
                record['created'] = owner.create_time()
                record.update(startRamGiB=ram, startCommitGiB=commit)
                capped_engines = set()
                if capped:
                    record['workingSetCaps'] = [cap_working_set(owner.pid, CAPPED_WORKING_SET_GIB)]
                start_at = time.monotonic()
                ready = False
                while time.monotonic() - start_at < LEASE_SECONDS:
                    if process.poll() is not None:
                        raise RuntimeError(f'Halo Strata exited. See {prefix}.server.log')
                    for child in owner.children(recursive=True):
                        children[child.pid] = child
                        if capped:
                            try:
                                if child.name().lower() != 'strata.exe':
                                    continue
                                identity = (child.pid, child.create_time())
                                if identity not in capped_engines:
                                    record['workingSetCaps'].append(cap_working_set(child.pid, CAPPED_WORKING_SET_GIB))
                                    capped_engines.add(identity)
                            except psutil.NoSuchProcess:
                                continue
                    if free_gib() < 5 or commit_free_gib() < 4:
                        raise RuntimeError('Halo Strata stopped at the 5 GiB RAM / 4 GiB commit guard')
                    if not ready:
                        if (not capped or capped_engines) and health(port):
                            ready = True
                            publish(state, record, 'ready')
                        elif time.monotonic() - start_at >= STARTUP_SECONDS:
                            raise RuntimeError('Halo Strata startup exceeded its deadline')
                    time.sleep(0.25 if capped and not ready else 1)
            publish(state, record, 'stopped')
        except Exception as error:
            publish(state, record, 'error', error=str(error))
            raise
        finally:
            if process is not None and process.poll() is None:
                try:
                    for child in psutil.Process(process.pid).children(recursive=True):
                        children[child.pid] = child
                except psutil.NoSuchProcess:
                    pass
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)
            for child in reversed(list(children.values())):
                try:
                    child.terminate()
                except psutil.NoSuchProcess:
                    pass
            _, remaining = psutil.wait_procs(children.values(), timeout=5)
            for child in remaining:
                try:
                    child.kill()
                except psutil.NoSuchProcess:
                    pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['preflight', 'start'])
    parser.add_argument('--capped', action='store_true')
    args = parser.parse_args()
    if args.action == 'preflight':
        _, ram, commit = preflight(args.capped)
        print(f'Halo preflight passed: {ram:.1f} GiB free RAM, {commit:.1f} GiB free commit.')
    else:
        start(args.capped)
