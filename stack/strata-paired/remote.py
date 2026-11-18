"""Run on the 5070 Ti through SSH. The controller prepends windows_memory.py."""
from hashlib import sha256
import json
import msvcrt
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
import urllib.request

tag, root_text, expected_sha = sys.argv[1:4]
if not re.fullmatch(r'halo-dsh-5070-(?:preflight|[a-f0-9]{16})', tag):
    raise ValueError('Invalid DSH worker identifier')
root = Path(root_text)
sys.path.insert(0, str(root / 'vendor'))
import psutil

MODEL_ID = 'qwen3.8-flash-next-iq3_s'
PORT = 18181
DEADLINE = 180
LEASE = 1800


def gpu_query(field):
    data = subprocess.check_output(
        ['nvidia-smi', f'--query-gpu={field}', '--format=csv,noheader,nounits'],
        text=True, timeout=5, creationflags=subprocess.CREATE_NO_WINDOW,
    )
    return int(data.strip())


def preflight():
    if any((p.info['name'] or '').lower() in ('strata.exe', 'llama-server.exe')
           for p in psutil.process_iter(['name'])):
        raise RuntimeError('A model server is already running on the worker')
    with socket.socket() as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        sock.bind(('127.0.0.1', PORT))
    if free_gib() < 18 or commit_free_gib() < 16 or gpu_query('memory.free') < 14336:
        raise RuntimeError('Worker requires 18 GiB RAM, 16 GiB commit and 14 GiB free VRAM')
    for name, key, expected_count in [
        ('model-copies-verified.json', None, 2), ('assets-verified.json', 'assets', 16),
    ]:
        receipt = json.loads((root / name).read_text(encoding='utf-8-sig'))
        if len(receipt if key is None else receipt[key]) != expected_count:
            raise RuntimeError(f'Unexpected worker asset receipt: {name}')
        if key is None:
            for row in receipt:
                if Path(row['file']).name != row['file']:
                    raise ValueError('Invalid worker model receipt path')
                stat = (root / 'models' / row['file']).stat()
                if (stat.st_size, stat.st_mtime_ns) != (row['bytes'], row['mtime_ns']):
                    raise RuntimeError('The staged worker model changed')
    raw = (root / 'blackwell-5070-strata-off-config.json').read_bytes()
    if sha256(raw).hexdigest() != expected_sha:
        raise RuntimeError('The approved worker configuration changed')
    config = json.loads(raw)
    if (config['host'], config['port'], config['model_name']) != ('127.0.0.1', PORT, MODEL_ID):
        raise RuntimeError('Unexpected worker endpoint or model')
    if config['args'][config['args'].index('--max-context') + 1] not in ('32768', 32768):
        raise RuntimeError('Worker configuration must use a 32,768-token context')
    python = root / 'strata-control/python/python.exe'
    paths = [python, Path(config['exe']), Path(config['cwd']), Path(config['tokenizer'])]
    for flag in ['--pack', '--native', '--ple-gguf', '--expert-profile']:
        paths.append(Path(config['args'][config['args'].index(flag) + 1]))
    if not all(path.exists() for path in paths):
        raise RuntimeError('A worker Strata asset is missing')
    return config, python


def healthy():
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/health', timeout=2) as response:
            return json.load(response).get('status') == 'ok'
    except (OSError, ValueError):
        return False


def serve(config, python):
    marker = root / f'{tag}-stop'
    private_config = root / f'{tag}-config.json'
    config.update(open_browser=False, engine_ready_s=DEADLINE, log=str(root / f'{tag}-engine.log'))
    with private_config.open('x', encoding='utf-8') as file:
        json.dump(config, file)
    cmd = [str(python), '-B', '-m', 'serve.server', '--engine', 'strata',
           '--config', str(private_config), '--port', str(PORT), '--host', '127.0.0.1',
           '--parallel', '1', '--offline']
    children = {}
    caps = []
    with (root / f'{tag}-server.log').open('x', encoding='utf-8') as log:
        process = subprocess.Popen(cmd, cwd=root / 'strata-control', stdout=log,
                                   stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW)
        try:
            owner = psutil.Process(process.pid)
            caps.append(cap_working_set(owner.pid, 12))
            print(json.dumps({'status': 'starting', 'pid': owner.pid, 'created': owner.create_time()}), flush=True)
            started = time.monotonic()
            ready = False
            while not marker.exists() and time.monotonic() - started < LEASE:
                if process.poll() is not None:
                    raise RuntimeError(f'Remote Strata exited with code {process.returncode}')
                if free_gib() < 5 or commit_free_gib() < 4:
                    raise RuntimeError('Worker stopped at the 5 GiB RAM / 4 GiB commit guard')
                for child in owner.children(recursive=True):
                    try:
                        identity = (child.pid, child.create_time())
                        if identity not in children and child.name().lower() == 'strata.exe':
                            caps.append(cap_working_set(child.pid, 12))
                        children[identity] = child
                    except psutil.NoSuchProcess:
                        continue
                if not ready:
                    if len(caps) >= 2 and healthy():
                        ready = True
                        print(json.dumps({'status': 'ready', 'workingSetCaps': caps}), flush=True)
                    elif time.monotonic() - started >= DEADLINE:
                        raise TimeoutError('Worker startup exceeded its deadline')
                time.sleep(0.25 if not ready else 1)
        finally:
            if process.poll() is None:
                try:
                    for child in psutil.Process(process.pid).children(recursive=True):
                        children[(child.pid, child.create_time())] = child
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
            _, remaining = psutil.wait_procs(remaining, timeout=5)
            if remaining:
                raise RuntimeError('Could not confirm worker cleanup')
            marker.unlink(missing_ok=True)
            print(json.dumps({'status': 'stopped'}), flush=True)


if '--preflight' in sys.argv:
    preflight()
    print('Remote Strata assets and headroom verified. No model started.')
else:
    with (root / 'dsh-strata-worker.lock').open('a+b') as lock:
        msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        serve(*preflight())
