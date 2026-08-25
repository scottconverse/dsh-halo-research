import json, sys, pathlib

src = sys.argv[1]
dst = pathlib.Path(sys.argv[2])
INCLUDE_THINKING = (len(sys.argv) > 3 and sys.argv[3] == 'thinking')

SYS_PREFIXES = (
    '<system-reminder', '[SYSTEM NOTIFICATION', '<task-notification',
    'Caveat: The messages below', '<local-command', '<command-name',
    '<command-message', 'Base directory for this skill:',
    'This session is being continued', 'Your task is to create a detailed summary',
)

def ordered_blocks(content):
    """Yield (kind, text) blocks in their original order."""
    if isinstance(content, str):
        yield ('text', content); return
    if isinstance(content, list):
        for b in content:
            if not isinstance(b, dict):
                continue
            t = b.get('type')
            if t == 'text':
                yield ('text', b.get('text', ''))
            elif t == 'thinking':
                yield ('thinking', b.get('thinking', ''))
            elif t == 'tool_use':
                yield ('tool', b.get('name', 'tool'))
            elif t == 'tool_result':
                yield ('tool_result', '')

def user_text(content):
    parts = list(ordered_blocks(content))
    txt = '\n'.join(t for k, t in parts if k == 'text').strip()
    if not txt:
        return None
    if txt.startswith(SYS_PREFIXES):
        return None
    return txt

turns = []   # (who, [ (kind,text), ... ])
with open(src, encoding='utf-8', errors='ignore') as fh:
    for line in fh:
        try:
            rec = json.loads(line)
        except Exception:
            continue
        msg = rec.get('message') or {}
        role = msg.get('role')
        if role == 'user':
            t = user_text(msg.get('content'))
            if t:
                turns.append(('You', [('text', t)]))
        elif role == 'assistant':
            seq = [(k, v) for k, v in ordered_blocks(msg.get('content'))
                   if k in ('text', 'thinking', 'tool')]
            if seq:
                turns.append(('Claude', seq))

# merge consecutive Claude turns (streaming splits) into one
merged = []
for who, seq in turns:
    if merged and merged[-1][0] == who == 'Claude':
        merged[-1][1].extend(seq)
    else:
        merged.append((who, list(seq)))

n_you = sum(1 for w, _ in merged if w == 'You')
n_claude = sum(1 for w, _ in merged if w == 'Claude')

out = ['# DeepSeek Harness on Strix Halo — Full Session Transcript\n']
if INCLUDE_THINKING:
    out.append('_Every message in this session, in order — including Claude\'s internal '
               'reasoning, shown as indented `> 💭` blockquotes. Raw tool output is omitted; '
               'a short note marks where tools ran._\n')
else:
    out.append('_Every message exchanged in this session, in order. Claude\'s internal '
               'reasoning and raw tool output are omitted; a short note marks where tools ran._\n')
out.append(f'_{n_you} of your messages, {n_claude} replies._\n')
out.append('\n---\n')

def flush_tools(names, out):
    if not names:
        return
    seen, uniq = set(), []
    for x in names:
        if x not in seen:
            seen.add(x); uniq.append(x)
    out.append(f'\n_[ran {len(names)} tool call(s): {", ".join(uniq)}]_\n')

for who, seq in merged:
    out.append(f'\n## {who}\n')
    pending_tools = []
    for kind, text in seq:
        if kind == 'tool':
            pending_tools.append(text)
            continue
        # a non-tool block ends any pending run of tool calls
        flush_tools(pending_tools, out); pending_tools = []
        if kind == 'text':
            if text.strip():
                out.append(text.strip() + '\n')
        elif kind == 'thinking' and INCLUDE_THINKING:
            block = '\n'.join('> ' + ln for ln in text.strip().splitlines())
            out.append('\n> 💭 **thinking**\n>\n' + block + '\n')
    flush_tools(pending_tools, out)

doc = '\n'.join(out)
dst.write_text(doc, encoding='utf-8')
print(f'turns: {len(merged)}  chars: {len(doc):,}  thinking={"ON" if INCLUDE_THINKING else "off"}  -> {dst}')
