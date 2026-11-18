"""Explicit, guarded Strata worker control. Start is the only model-loading action."""
import argparse
import base64
import json
import msvcrt
import re
import socket
import subprocess
import time
import urllib.request
import uuid
from pathlib import Path

from settings import HERE, MODEL, NO_WINDOW, settings

CONFIG = settings('worker')
ROOT = CONFIG['remoteRoot']
REMOTE_PYTHON = CONFIG['remotePython']
SSH = [
    CONFIG['ssh'], '-T', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
    '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=2',
]
HOST = CONFIG['target']
if not re.fullmatch(r'[a-zA-Z0-9_.-]+@[a-zA-Z0-9][a-zA-Z0-9.-]*', HOST):
    raise ValueError('Set worker.target to the SSH username and DNS name or IPv4 address')
STATE = HERE / 'state.json'
MAX_SECONDS = 1800


def quote(text):
    return "'" + text.replace("'", "''") + "'"


def supervisor_command(tag, preflight=False):
    arguments = ['-E', '-B', '-', tag, ROOT, CONFIG['launchSHA256'].lower()]
    if preflight:
        arguments.append('--preflight')
    return '& ' + ' '.join(map(quote, [REMOTE_PYTHON, *arguments])) + '; exit $LASTEXITCODE'


def command(code, forward=False):
    options = ['-o', 'ExitOnForwardFailure=yes', '-L', '127.0.0.1:8082:127.0.0.1:18181'] if forward else []
    encoded = base64.b64encode(code.encode('utf-16le')).decode('ascii')
    return [*SSH, *options, HOST, 'powershell', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded]


def publish(data):
    pending = STATE.with_suffix('.tmp')
    pending.write_text(json.dumps(data, indent=2), encoding='utf-8')
    pending.replace(STATE)


def remote_payload():
    source = '\n'.join((HERE / name).read_text(encoding='utf-8-sig')
                       for name in ['windows_memory.py', 'remote.py'])
    return source.encode('utf-8')


def require_local_port():
    with socket.socket() as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        sock.bind(('127.0.0.1', 8082))


def preflight():
    require_local_port()
    # Execute in memory so this diagnostic leaves no remote file.
    code = supervisor_command('halo-dsh-5070-preflight', preflight=True)
    result = subprocess.run(command(code), input=remote_payload(), capture_output=True,
                            check=True, timeout=25, creationflags=NO_WINDOW)
    message = 'Remote Strata assets and headroom verified. No model started.'
    if message.encode() not in result.stdout:
        raise RuntimeError('The remote preflight did not return its completion marker')
    print(message)


def stop(tag):
    if not re.fullmatch(r'halo-dsh-5070-[a-f0-9]{16}', tag):
        raise ValueError('Invalid owned worker identifier')
    marker = quote(f'{ROOT}/{tag}-stop')
    code = f"$ErrorActionPreference='Stop'; [IO.File]::WriteAllBytes({marker}, [byte[]]@())"
    subprocess.run(command(code), check=True, timeout=25, creationflags=NO_WINDOW)


def model_ready():
    try:
        with urllib.request.urlopen('http://127.0.0.1:8082/v1/models', timeout=2) as response:
            return MODEL in {item['id'] for item in json.load(response)['data']}
    except (OSError, ValueError, KeyError):
        return False


def start():
    with (HERE / 'worker.lock').open('a+b') as lock:
        try:
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError as exc:
            raise RuntimeError('The DSH 5070 Ti worker controller is already running') from exc
        require_local_port()
        tag = 'halo-dsh-5070-' + uuid.uuid4().hex[:16]
        log_path = HERE / (tag + '.log')
        code = supervisor_command(tag)
        record = {
            'tag': tag, 'started': time.time(), 'status': 'starting', 'log': str(log_path),
            'readyEndpoint': 'http://127.0.0.1:8082/v1/models',
            'cancel': 'Stop DSH 5070 Ti Worker', 'maxSeconds': MAX_SECONDS,
        }
        with log_path.open('w', encoding='utf-8') as log:
            process = subprocess.Popen(command(code, forward=True), stdin=subprocess.PIPE,
                                       stdout=log, stderr=log, creationflags=NO_WINDOW)
            record['sshPid'] = process.pid
            publish(record)
            try:
                with process.stdin:
                    process.stdin.write(remote_payload())
                deadline = time.monotonic() + 195
                while time.monotonic() < deadline and process.poll() is None:
                    remote_ready = '"status": "ready"' in log_path.read_text(encoding='utf-8', errors='replace')
                    if remote_ready and model_ready():
                        break
                    time.sleep(1)
                else:
                    if process.poll() == 0 and '"status": "stopped"' in log_path.read_text(encoding='utf-8', errors='replace'):
                        record.update(status='stopped')
                        return
                    raise RuntimeError('Remote Strata did not become ready. See the worker log.')
                record.update(status='ready', readyAt=time.time())
                publish(record)
                if process.wait(timeout=MAX_SECONDS + 45):
                    raise RuntimeError('Remote Strata exited with an error. See the worker log.')
                if '"status": "stopped"' not in log_path.read_text(encoding='utf-8', errors='replace'):
                    raise RuntimeError('Remote cleanup could not be confirmed. See the worker log.')
                record.update(status='stopped')
            except BaseException as exc:
                record.update(status='error', error=str(exc))
                raise
            finally:
                try:
                    if process.poll() is None:
                        stop(tag)
                        process.wait(timeout=45)
                finally:
                    record.update(finished=time.time(), sshExit=process.poll())
                    publish(record)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['preflight', 'start', 'stop', 'status'])
    action = parser.parse_args().action
    if action == 'preflight':
        preflight()
    elif action == 'start':
        start()
    else:
        record = json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {'status': 'stopped'}
        if action == 'status':
            record['ready'] = record['status'] == 'ready' and model_ready()
            print(json.dumps(record, indent=2))
        elif record['status'] in ('starting', 'ready'):
            stop(record['tag'])


if __name__ == '__main__':
    main()
