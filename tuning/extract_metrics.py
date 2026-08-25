"""Extract honest metrics from a DSH session log (.jsonl.zstd).

Everything here is measured from what the agent actually did — token counts,
tool calls, compactions, context growth — not from any summary. Used by the
tuning harness to grade each config.

Usage:  python extract_metrics.py <session.jsonl.zstd>   -> prints JSON metrics
        python extract_metrics.py --newest-after <epoch_seconds>
"""
import sys
import os
import json
import glob
import zstandard


def load(path):
    with open(path, "rb") as fh:
        raw = zstandard.ZstdDecompressor().stream_reader(fh).read()
    return raw.decode("utf-8", "ignore").splitlines()


def newest_session(after_epoch=None):
    roots = [os.path.expanduser("~/.dsh/sessions")]
    cands = []
    for r in roots:
        cands += glob.glob(os.path.join(r, "**", "*.jsonl.zstd"), recursive=True)
    if after_epoch is not None:
        cands = [c for c in cands if os.path.getmtime(c) >= after_epoch - 2]
    if not cands:
        return None
    return max(cands, key=os.path.getmtime)


def metrics(path):
    lines = load(path)
    reasoning_chars = 0
    text_chars = 0
    tool_calls = 0
    tool_names = {}
    compactions = 0
    retries = 0
    peak_prompt_tokens = 0        # largest context (input) the model saw
    total_completion_tokens = 0
    total_reasoning_tokens = 0
    steps = 0
    first_t = None
    last_t = None

    for ln in lines:
        try:
            r = json.loads(ln)
        except Exception:
            continue
        t = r.get("type")
        d = r.get("data", {}) if isinstance(r.get("data"), dict) else {}
        tstamp = r.get("time") or d.get("time")
        if isinstance(tstamp, (int, float)):
            first_t = tstamp if first_t is None else min(first_t, tstamp)
            last_t = tstamp if last_t is None else max(last_t, tstamp)

        if t == "step/start":
            steps += 1
        elif t == "tool/call":
            tool_calls += 1
            nm = d.get("name", "?")
            tool_names[nm] = tool_names.get(nm, 0) + 1
        elif t and "compact" in t.lower():
            compactions += 1
        elif t == "llm/retry":
            retries += 1

        ch = d.get("chunk", {}) if isinstance(d, dict) else {}
        if ch.get("type") == "reasoning-delta":
            reasoning_chars += len(ch.get("text", ""))
        elif t == "reasoning-chunks":
            for x in d.get("texts", []):
                reasoning_chars += len(x)
        elif ch.get("type") == "text-delta":
            text_chars += len(ch.get("text", ""))
        elif t == "text-chunks":
            for x in d.get("texts", []):
                text_chars += len(x)

        # usage lives in assistant/chunk records: chunk.type == "usage"
        if ch.get("type") == "usage":
            u = ch.get("usage", {}) or {}
            it = u.get("inputTokens")
            ot = u.get("outputTokens")
            if isinstance(it, (int, float)):
                peak_prompt_tokens = max(peak_prompt_tokens, int(it))
            if isinstance(ot, (int, float)):
                total_completion_tokens += int(ot)

    wall_s = None
    if first_t is not None and last_t is not None:
        wall_s = round((last_t - first_t) / 1000.0, 1)

    # action ratio: how much of its output was DOING vs THINKING (by char proxy)
    denom = reasoning_chars + text_chars
    action_ratio = round(text_chars / denom, 3) if denom else None

    return {
        "session": os.path.basename(os.path.dirname(path)),
        "records": len(lines),
        "steps": steps,
        "tool_calls": tool_calls,
        "tool_names": tool_names,
        "compactions": compactions,
        "llm_retries": retries,
        "reasoning_chars": reasoning_chars,
        "text_chars": text_chars,
        "action_ratio_by_chars": action_ratio,
        "peak_context_tokens": peak_prompt_tokens,
        "total_output_tokens": total_completion_tokens,
        "session_wall_seconds": wall_s,
    }


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--newest-after":
        p = newest_session(float(sys.argv[2]))
    elif len(sys.argv) >= 2:
        p = sys.argv[1]
    else:
        p = newest_session()
    if not p or not os.path.exists(p):
        print(json.dumps({"error": "no session log found"}))
        sys.exit(1)
    print(json.dumps(metrics(p), indent=2))
