"""T-23 probe: does the TOP-LEVEL reasoning_effort field (DSH's wire mechanism,
catalog.ts:343) move reasoning tokens through LM Studio? 5 conditions x 4 reps,
unique nonce per call, thinking-mode sampling per the model card."""
import json, urllib.request, time
from statistics import mean

URL = "http://127.0.0.1:1234/v1/chat/completions"
MODEL = "unsloth/qwen3.8-27b"
Q = ("A bat and a ball cost 1.10 dollars in total. The bat costs 1.00 dollar "
     "more than the ball. How much does the ball cost, in cents? "
     "Reply with ONLY the integer.")

def call(effort):
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": Q + f" (nonce:{time.time_ns()})"}],
        "max_tokens": 2048, "temperature": 1.0, "top_p": 0.95, "top_k": 20,
    }
    if effort is not None:
        payload["reasoning_effort"] = effort
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": "Bearer x"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=600) as r:
        d = json.load(r)
    u = d.get("usage", {}) or {}
    det = u.get("completion_tokens_details") or {}
    content = (d["choices"][0]["message"].get("content") or "").strip().replace("\n", " ")
    return {"effort": effort, "reasoning": det.get("reasoning_tokens"),
            "completion": u.get("completion_tokens"),
            "correct": ("5" == content or content.endswith(" 5") or content == "5 cents"),
            "content": content[:30], "secs": round(time.time() - t0, 1)}

LEVELS = [None, "none", "low", "medium", "xhigh"]
runs = []
for effort in LEVELS:
    for i in range(4):
        r = call(effort)
        runs.append(r)
        print(r, flush=True)

print("\n=== SUMMARY (mean reasoning tokens per condition) ===")
for e in LEVELS:
    xs = [r["reasoning"] for r in runs if r["effort"] == e and isinstance(r["reasoning"], int)]
    cs = [r["correct"] for r in runs if r["effort"] == e]
    label = "absent" if e is None else e
    print(f"{label:8s} n={len(xs)} mean_reasoning={round(mean(xs),1) if xs else 'N/A'} "
          f"range={min(xs) if xs else '-'}..{max(xs) if xs else '-'} correct={sum(cs)}/{len(cs)}")
