#!/usr/bin/env python3
"""Effort sweep over HumanEval for DeepSeek V4.1 Flash 1017 via Ollama.

Runs the real OpenAI HumanEval tasks (164 function-completion problems, tests
included) at four thinking settings, executes each completion in an isolated
subprocess, and reports pass@1 with Wilson intervals.

Usage:
  python bench.py run --limit 40 --efforts off,low,high,max
  python bench.py run --limit 8 --tasks HumanEval/0,HumanEval/1
  python bench.py report
"""
import argparse
import gzip
import json
import os
import random
import re
import statistics
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATASETS = {
    "humaneval": ROOT / "data" / "HumanEval.jsonl.gz",
    "humanevalplus": ROOT / "data" / "HumanEvalPlus.jsonl",
}
RESULTS = ROOT / "results.jsonl"
MODEL = os.environ.get("BENCH_MODEL", "deepseek-v4.1-flash:1017-cloud")
OLLAMA = os.environ.get("OLLAMA_BASE", "http://127.0.0.1:11434")

HEADER = "from typing import *\nimport math, collections, itertools, re, sys, heapq, bisect\n"


def load_tasks(suite):
    path = DATASETS[suite]
    if not path.exists():
        sys.exit(f"missing {path}; download the dataset first")
    tasks = []
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as f:
        for line in f:
            tasks.append(json.loads(line))
    return tasks


def build_prompt(task):
    return (
        "Complete the following Python function. Return the complete function "
        "definition, including the signature and docstring, in one code block. "
        "Do not include tests or explanations.\n\n" + task["prompt"]
    )


def extract_code(text, entry_point):
    """Keep every code block, not just the one starting at entry_point.

    Models often define helpers before the entry point; cutting from
    `def <entry_point>` drops them (seen on HumanEval/10: NameError
    is_palindrome). """
    blocks = re.findall(r"```(?:python)?\s*(.*?)```", text, flags=re.S)
    code_blocks = [b for b in blocks if "def " in b or "import " in b]
    if code_blocks:
        code = "\n\n".join(code_blocks)
    else:
        m = re.search(r"(?m)^(?:def |from |import )", text)
        code = text[m.start():] if m else text
    return code.strip() + "\n"


def call_model(prompt, effort, cap, timeout=3600):
    think = False if effort == "off" else effort
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "think": think,
        "options": {"temperature": 0, "num_predict": cap},
    }
    req = urllib.request.Request(
        f"{OLLAMA}/api/chat",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as r:
        body = json.loads(r.read())
    msg = body.get("message", {})
    thinking = msg.get("thinking") or ""
    return {
        "text": msg.get("content", ""),
        "thinking": thinking,
        "thinking_chars": len(thinking),
        "tokens_in": body.get("prompt_eval_count"),
        "tokens_out": body.get("eval_count"),
        "done_reason": body.get("done_reason"),
        "model": body.get("model") or MODEL,
        "seconds": round(time.time() - t0, 2),
    }


def run_tests(task, code, timeout=15):
    """Execute prompt prelude + completion + official test in a subprocess.

    The prompt is part of the program: several HumanEval tasks define helper
    functions there (e.g. /38 defines encode_cyclic and asks for decode_cyclic;
    /50 defines encode_shift). Running the completion alone makes those tasks
    fail in every arm with NameError. Returns (passed, error)."""
    program = (HEADER + "\n" + task["prompt"] + "\n" + code + "\n\n"
               + task["test"] + f"\n\ncheck({task['entry_point']})\n")
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "solution.py"
        path.write_text(program, encoding="utf-8")
        try:
            p = subprocess.run(
                [sys.executable, "-I", "-B", str(path)],
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=d,
            )
        except subprocess.TimeoutExpired:
            return False, "timeout"
        if p.returncode == 0:
            return True, ""
        tail = (p.stderr or p.stdout or "").strip().splitlines()
        return False, (tail[-1] if tail else f"exit {p.returncode}")[:300]


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    den = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / den
    half = z * ((p * (1 - p) / n + z * z / (4 * n * n)) ** 0.5) / den
    return (max(0.0, centre - half), min(1.0, centre + half))


def load_results():
    rows = []
    if RESULTS.exists():
        for line in RESULTS.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))
    return rows


def run(args):
    global RESULTS
    cap = args.cap
    RESULTS = ROOT / f"results-cap-{cap}.jsonl"
    raw_dir = ROOT / "raw" / f"cap-{cap}"
    raw_dir.mkdir(parents=True, exist_ok=True)

    tasks = load_tasks(args.suite)
    efforts = [e.strip() for e in args.efforts.split(",") if e.strip()]
    if args.tasks:
        wanted = {t.strip() for t in args.tasks.split(",")}
        tasks = [t for t in tasks if t["task_id"] in wanted]
    elif args.limit:
        rng = random.Random(args.seed)
        tasks = rng.sample(tasks, min(args.limit, len(tasks)))
    tasks.sort(key=lambda t: t["task_id"])

    # The cap is part of the run identity: a 2K result can never satisfy a 64K case.
    done = {(r.get("suite"), r.get("cap"), r["task_id"], r["effort"]) for r in load_results()}
    total = len(tasks) * len(efforts)
    n = 0
    for task in tasks:
        for effort in efforts:
            n += 1
            if (args.suite, cap, task["task_id"], effort) in done:
                print(f"[{n}/{total}] skip {task['task_id']} {effort} (cap {cap} already recorded)")
                continue
            prompt = build_prompt(task)
            try:
                resp = call_model(prompt, effort, cap, args.http_timeout)
            except Exception as e:
                row = {
                    "suite": args.suite, "cap": cap,
                    "task_id": task["task_id"], "effort": effort,
                    "outcome": "call_error", "passed": False,
                    "error": f"call failed: {e}", "seconds": None, "tokens_in": None,
                    "tokens_out": None, "done_reason": None,
                    "thinking_chars": None, "model": MODEL,
                }
            else:
                raw = {
                    "task_id": task["task_id"], "effort": effort, "cap": cap,
                    "prompt": prompt, "response": resp,
                }
                (raw_dir / f"{task['task_id'].replace('/', '_')}__{effort}.json").write_text(
                    json.dumps(raw, indent=2), encoding="utf-8")
                code = extract_code(resp["text"], task["entry_point"])
                passed, err = run_tests(task, code)
                cap_hit = resp["done_reason"] == "length" or (resp["tokens_out"] or 0) >= cap
                if passed:
                    outcome = "passed"
                elif cap_hit:
                    outcome = "cap_exhausted"
                elif err == "timeout":
                    outcome = "test_timeout"
                else:
                    outcome = "failed_tests"
                row = {
                    "suite": args.suite, "cap": cap,
                    "task_id": task["task_id"], "effort": effort,
                    "outcome": outcome, "passed": passed, "error": err,
                    "seconds": resp["seconds"], "tokens_in": resp["tokens_in"],
                    "tokens_out": resp["tokens_out"], "done_reason": resp["done_reason"],
                    "thinking_chars": resp["thinking_chars"], "model": resp["model"],
                    "code_chars": len(code),
                    "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
            with RESULTS.open("a", encoding="utf-8") as f:
                f.write(json.dumps(row) + "\n")
            print(f"[{n}/{total}] {task['task_id']:<16} {effort:<5} {row['outcome']:<13} "
                  f"{row['seconds']}s in={row['tokens_in']} out={row['tokens_out']} "
                  f"stop={row['done_reason']} think={row['thinking_chars']} {row['error'][:70]}")


def report(args):
    rows = load_results()
    if not rows:
        print(f"no results yet in {RESULTS.name}")
        return
    efforts = ["off", "low", "high", "max"]
    suites = []
    for r in rows:
        s = r.get("suite", "humaneval")
        if s not in suites:
            suites.append(s)
    print(f"file: {RESULTS.name}  cap: {args.cap}  model: {MODEL}")
    for suite in suites:
        print(f"\n== {suite} ==")
        print(f"{'effort':<7}{'n':>4}{'pass':>6}{'done':>6}{'rate':>7}{'95% CI':>13}"
              f"{'cap_exh':>9}{'err':>5}{'med s':>8}{'mean out':>10}{'mean think':>12}")
        for e in efforts:
            g = [r for r in rows if r.get("suite", "humaneval") == suite and r["effort"] == e]
            if not g:
                continue
            outcome = lambda r: r.get("outcome") or ("passed" if r["passed"] else "failed_tests")
            passed = sum(1 for r in g if r["passed"])
            completed = [r for r in g if outcome(r) in ("passed", "failed_tests")]
            capx = sum(1 for r in g if outcome(r) == "cap_exhausted")
            errs = sum(1 for r in g if outcome(r) in ("call_error", "test_timeout"))
            k, n = passed, len(completed)
            lo, hi = wilson(k, n) if n else (0.0, 0.0)
            secs = [r["seconds"] for r in g if r.get("seconds")]
            outs = [r["tokens_out"] for r in g if r.get("tokens_out")]
            th = [r["thinking_chars"] for r in g if r.get("thinking_chars") is not None]
            print(f"{e:<7}{len(g):>4}{passed:>6}{n:>6}{(100*k/n if n else 0):>6.1f}%"
                  f"{f'{100*lo:.0f}-{100*hi:.0f}%':>13}{capx:>9}{errs:>5}"
                  f"{(statistics.median(secs) if secs else 0):>8.1f}"
                  f"{(statistics.mean(outs) if outs else 0):>10.0f}"
                  f"{(statistics.mean(th) if th else 0):>12.0f}")
        print("rate excludes cap_exhausted and errored calls; pass/denominator shown as pass/done")

    for label, outcomes in (("failed tests", ("failed_tests",)),
                            ("cap exhausted (no answer)", ("cap_exhausted",)),
                            ("errors/timeouts", ("call_error", "test_timeout"))):
        subset = [r for r in rows if (r.get("outcome") or ("passed" if r["passed"] else "failed_tests")) in outcomes]
        print(f"\n{label}: {len(subset)}")
        for r in subset[:15]:
            print(f"  {r.get('suite','humaneval'):<13} {r['task_id']:<16} {r['effort']:<5} "
                  f"out={r.get('tokens_out')} stop={r.get('done_reason')} {str(r.get('error'))[:80]}")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--suite", choices=sorted(DATASETS), default="humaneval")
    r.add_argument("--cap", type=int, default=int(os.environ.get("BENCH_CAP", "65536")))
    r.add_argument("--http-timeout", type=int, default=7200)
    r.add_argument("--limit", type=int, default=0)
    r.add_argument("--tasks", default="")
    r.add_argument("--efforts", default="off,low,high,max")
    r.add_argument("--seed", type=int, default=1024)
    r.set_defaults(func=run)
    p = sub.add_parser("report")
    p.add_argument("--cap", type=int, default=int(os.environ.get("BENCH_CAP", "65536")))
    p.set_defaults(func=report)
    args = ap.parse_args()
    global RESULTS
    RESULTS = ROOT / f"results-cap-{args.cap}.jsonl"
    args.func(args)


if __name__ == "__main__":
    main()

