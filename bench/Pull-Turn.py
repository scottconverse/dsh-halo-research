import json, sys, pathlib

path, want, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]

def text_of(msg):
    c = msg.get('content')
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return '\n'.join(b.get('text', '') for b in c if isinstance(b, dict) and b.get('type') == 'text')
    return ''

with open(path, encoding='utf-8', errors='ignore') as fh:
    for i, line in enumerate(fh, 1):
        if i != want:
            continue
        rec = json.loads(line)
        t = text_of(rec.get('message') or {})
        pathlib.Path(out).write_text(t, encoding='utf-8')
        print(f'line {i} -> {out} ({len(t):,} chars)')
        break
