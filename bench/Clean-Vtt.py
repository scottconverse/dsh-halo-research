import re, sys, pathlib

# YouTube auto-captions roll: each cue repeats the previous line plus new words.
# Strip timing/markup, then drop any line already covered by what we've kept.
def clean(path):
    raw = pathlib.Path(path).read_text(encoding='utf-8', errors='ignore')
    out, seen = [], set()
    for line in raw.splitlines():
        line = line.strip()
        if (not line or line.startswith(('WEBVTT', 'Kind:', 'Language:', 'NOTE'))
                or '-->' in line or re.fullmatch(r'\d+', line)):
            continue
        line = re.sub(r'<[^>]+>', '', line)          # <c> / <00:00:00.000> markup
        line = re.sub(r'\s+', ' ', line).strip()
        if not line or line in seen:
            continue
        seen.add(line)
        out.append(line)
    # collapse the rolling overlap: drop a line fully contained in the previous one
    final = []
    for l in out:
        if final and l in final[-1]:
            continue
        final.append(l)
    return ' '.join(final)

for p in sys.argv[1:]:
    txt = clean(p)
    dst = pathlib.Path(p).with_suffix('.txt')
    dst.write_text(txt, encoding='utf-8')
    print(f'{dst.name}: {len(txt):,} chars')
