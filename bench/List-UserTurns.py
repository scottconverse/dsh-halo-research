import json, sys, re

path = sys.argv[1]

def text_of(msg):
    c = msg.get('content')
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return '\n'.join(b.get('text', '') for b in c if isinstance(b, dict) and b.get('type') == 'text')
    return ''

SKIP = ('<system-reminder', '[SYSTEM NOTIFICATION', '<task-notification',
        'Caveat: The messages below', '<local-command', '<command-name')

seen, out = set(), []
with open(path, encoding='utf-8', errors='ignore') as fh:
    for i, line in enumerate(fh, 1):
        try:
            rec = json.loads(line)
        except Exception:
            continue
        msg = rec.get('message') or {}
        if msg.get('role') != 'user':
            continue
        t = text_of(msg).strip()
        if not t or t.startswith(SKIP):
            continue
        key = t[:120]
        if key in seen:
            continue
        seen.add(key)
        first = re.sub(r'\s+', ' ', t)[:150]
        out.append((i, len(t), first))

print(f'distinct user turns: {len(out)}\n')
for i, n, first in out:
    print(f'{i:>7} {n:>7,}  {first}')
