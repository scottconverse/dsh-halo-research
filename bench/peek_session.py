import zstandard, json, sys, glob, os
base = os.path.expanduser(r"~/.dsh/sessions")
files = glob.glob(os.path.join(base, "**", "*.zstd"), recursive=True)
sf = max(files, key=os.path.getmtime)
with open(sf, "rb") as fh:
    raw = zstandard.ZstdDecompressor().stream_reader(fh).read()
lines = raw.decode("utf-8", "ignore").splitlines()

from collections import Counter
types = Counter()
reason = []
last_tool = None
for ln in lines:
    try:
        r = json.loads(ln)
    except Exception:
        continue
    t = r.get("type"); types[t] += 1
    d = r.get("data", {})
    if t == "tool/call":
        last_tool = str(d.get("name")) + " :: " + str(d.get("arguments", ""))[:110]
    ch = d.get("chunk", {}) if isinstance(d, dict) else {}
    if ch.get("type") == "reasoning-delta":
        reason.append(ch.get("text", ""))
    elif t == "reasoning-chunks":
        reason.extend(d.get("texts", []))

full = "".join(reason)
print("records:", len(lines))
print("steps:", types.get("step/start"), "tool/call:", types.get("tool/call"), "retries:", types.get("llm/retry"))
print("reasoning chars total:", len(full))
print("last tool call:", last_tool)
print("=== reasoning tail (last 1000) ===")
print(full[-1000:])
