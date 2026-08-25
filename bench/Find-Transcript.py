import json, sys, pathlib, re

path = sys.argv[1]
needle = sys.argv[2] if len(sys.argv) > 2 else 'DGX'

def text_of(msg):
    c = msg.get('content')
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return '\n'.join(b.get('text', '') for b in c if isinstance(b, dict) and b.get('type') == 'text')
    return ''

hits = []
with open(path, encoding='utf-8', errors='ignore') as fh:
    for i, line in enumerate(fh, 1):
        try:
            rec = json.loads(line)
        except Exception:
            continue
        msg = rec.get('message') or {}
        if msg.get('role') != 'user':
            continue
        t = text_of(msg)
        if needle.lower() in t.lower():
            hits.append((i, len(t), t))

print(f'user messages containing "{needle}": {len(hits)}')
for i, n, t in hits:
    print(f'  line {i}: {n:,} chars')

# the transcript we want is the longest such message
if hits:
    best = max(hits, key=lambda h: h[1])
    out = pathlib.Path(sys.argv[3]) if len(sys.argv) > 3 else pathlib.Path('recovered.txt')
    out.write_text(best[2], encoding='utf-8')
    print(f'\nlongest -> {out} ({best[1]:,} chars, from line {best[0]})')
