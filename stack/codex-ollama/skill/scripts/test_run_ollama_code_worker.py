"""Tests for the bounded Ollama/Codex worker launcher."""

from __future__ import annotations

import io
import json
import os
import subprocess
import tempfile
import tomllib
import unittest
from pathlib import Path
from unittest.mock import patch

import run_ollama_code_worker as launcher


SCRIPTS = Path(__file__).resolve().parent
REPO_ROOT = next(parent for parent in SCRIPTS.parents if (parent / ".git").exists())
PROFILE = REPO_ROOT / "stack" / "codex-ollama" / "ollama-deepseek-code-worker.config.toml"
PROFILE_VALUES = tomllib.loads(PROFILE.read_text(encoding="utf-8"))
FAKE_CODEX = Path(r"C:\fake\codex.exe")

AGENT_DONE = {"type": "item.completed", "item": {"type": "agent_message", "text": "done"}}
THREAD_STARTED = {"type": "thread.started", "thread_id": "thread-1", "session_id": "session-1"}
TURN_COMPLETED = {
    "type": "turn.completed",
    "usage": {"input_tokens": 10, "output_tokens": 3, "total_tokens": 13},
}


def jsonl(*events: object) -> str:
    lines = [event if isinstance(event, str) else json.dumps(event) for event in events]
    return "\n".join(lines) + "\n"


class FakeRunner:
    """Records the launch and returns canned child output."""

    def __init__(self, *, stdout: str = "", stderr: str = "", code: int = 0, error: Exception | None = None, result: str | None = None):
        self.stdout = stdout
        self.stderr = stderr
        self.code = code
        self.error = error
        self.result = result
        self.calls: list[dict[str, object]] = []

    def __call__(self, command, **kwargs):
        self.calls.append({"command": list(command), "kwargs": kwargs})
        if self.error is not None:
            raise self.error
        result_path = command[command.index("--output-last-message") + 1]
        if self.result is not None:
            Path(result_path).write_text(self.result, encoding="utf-8", newline="")
        return subprocess.CompletedProcess(command, self.code, self.stdout, self.stderr)


class WorkerLauncherTests(unittest.TestCase):
    def make_args(self, root: str, *, resume: str | None = None, prompt_name: str = "prompt.txt", result_name: str = "result.txt", events_name: str = "events.jsonl", stderr_name: str = "stderr.txt", receipt_name: str = "receipt.json"):
        prompt = Path(root) / prompt_name
        if not prompt.exists():
            prompt.write_text("Do the bounded thing.", encoding="utf-8")
        paths = {
            "prompt": prompt,
            "result": Path(root) / result_name,
            "events": Path(root) / events_name,
            "stderr": Path(root) / stderr_name,
            "receipt": Path(root) / receipt_name,
        }
        args = [
            "--cwd", root,
            "--prompt-file", str(paths["prompt"]),
            "--result-file", str(paths["result"]),
            "--events-file", str(paths["events"]),
            "--stderr-file", str(paths["stderr"]),
            "--receipt-file", str(paths["receipt"]),
            "--profile", str(PROFILE),
            "--codex", str(FAKE_CODEX),
        ]
        if resume is not None:
            args.extend(("--resume", resume))
        return args, paths

    def config_values(self, command):
        values = []
        for index, token in enumerate(command):
            if token == "-c":
                values.append(command[index + 1])
        return values

    def assert_shared_overrides(self, command):
        joined = "\n".join(self.config_values(command))
        self.assertIn('approval_policy="never"', joined)
        self.assertIn('model=' + json.dumps(PROFILE_VALUES["model"]), joined)
        self.assertIn('model_provider="ollama-code-worker"', joined)
        self.assertIn('features.multi_agent=false', joined)
        self.assertIn('model_providers.ollama-code-worker.base_url=' + json.dumps(PROFILE_VALUES["model_providers"]["ollama-code-worker"]["base_url"]), joined)

    def test_fresh_command_shape_and_launch(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            runner = FakeRunner(stdout=jsonl(THREAD_STARTED, AGENT_DONE, TURN_COMPLETED), result="done")

            code = launcher.main(args, runner=runner)

            self.assertEqual(code, 0)
            self.assertEqual(len(runner.calls), 1)
            call = runner.calls[0]
            command = call["command"]
            self.assertEqual(command[:2], [str(FAKE_CODEX), "exec"])
            self.assertNotIn("resume", command)
            self.assertIn("--ignore-user-config", command)
            self.assertIn("--strict-config", command)
            self.assertEqual(command[command.index("--cd") + 1], str(Path(root).resolve()))
            self.assertEqual(command[command.index("--sandbox") + 1], "danger-full-access")
            self.assertNotIn("--profile", command)
            self.assertNotIn("--dangerously-bypass-approvals-and-sandbox", command)
            self.assertEqual(command[command.index("--output-last-message") + 1], str(paths["result"].resolve()))
            self.assert_shared_overrides(command)
            self.assertEqual(call["kwargs"]["cwd"], Path(root).resolve())
            self.assertEqual(call["kwargs"]["input"], "Do the bounded thing.")
            self.assertIs(call["kwargs"]["check"], False)
            self.assertIs(call["kwargs"]["stdout"], subprocess.PIPE)

    def test_resume_command_shape_uses_supported_flags_only(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root, resume="session-42")
            runner = FakeRunner(
                stdout=jsonl({"type": "thread.started", "thread_id": "thread-1", "session_id": "session-42"}, AGENT_DONE, TURN_COMPLETED),
                result="done",
            )

            code = launcher.main(args, runner=runner)

            self.assertEqual(code, 0)
            command = runner.calls[0]["command"]
            self.assertEqual(command[:4], [str(FAKE_CODEX), "exec", "resume", "session-42"])
            self.assertIn("--dangerously-bypass-approvals-and-sandbox", command)
            self.assertNotIn("--cd", command)
            self.assertNotIn("--sandbox", command)
            self.assertNotIn("--profile", command)
            self.assertIn("--json", command)
            self.assertIn("--output-last-message", command)
            self.assert_shared_overrides(command)
            self.assertEqual(command[-1], "-")
            self.assertEqual(runner.calls[0]["kwargs"]["input"], "Do the bounded thing.")

            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertEqual(receipt["mode"], "resume")
            self.assertEqual(receipt["attempted_session_id"], "session-42")
            self.assertEqual(receipt["resumed_session_id"], "session-42")
            self.assertEqual(receipt["session_id"], "session-42")
            self.assertEqual(runner.calls[0]["kwargs"]["cwd"], Path(root).resolve())

    def test_resume_id_mismatch_fails_instead_of_reporting_success(self):
        with tempfile.TemporaryDirectory() as root:
            requested = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
            observed = "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee"
            args, paths = self.make_args(root, resume=requested)
            runner = FakeRunner(
                stdout=jsonl(
                    {"type": "thread.started", "thread_id": observed},
                    AGENT_DONE,
                    TURN_COMPLETED,
                ),
                result="done",
            )

            code = launcher.main(args, runner=runner)

            self.assertNotEqual(code, 0)
            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertFalse(receipt["success"])
            self.assertEqual(receipt["attempted_session_id"], requested)
            self.assertEqual(receipt["resumed_session_id"], observed)
            self.assertIn("different session id", receipt["error"])

    def test_dry_run_prints_mode_and_command_without_writing(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            args.append("--dry-run")
            runner = FakeRunner()

            buffer = io.StringIO()
            with patch("sys.stdout", buffer):
                code = launcher.main(args, runner=runner)

            self.assertEqual(code, 0)
            self.assertEqual(runner.calls, [])
            payload = json.loads(buffer.getvalue())
            self.assertEqual(payload["mode"], "fresh")
            self.assertEqual(payload["command"][:2], [str(FAKE_CODEX), "exec"])
            self.assertEqual(payload["cwd"], str(Path(root).resolve()))
            self.assertFalse(paths["events"].exists())
            self.assertFalse(paths["receipt"].exists())

    def test_prompt_output_collision_rejected_before_write_or_inference(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root, result_name="prompt.txt")
            runner = FakeRunner()

            with self.assertRaises(SystemExit) as caught:
                launcher.main(args, runner=runner)

            self.assertIn("prompt", str(caught.exception))
            self.assertEqual(paths["prompt"].read_text(encoding="utf-8"), "Do the bounded thing.")
            self.assertEqual(runner.calls, [])
            self.assertFalse(paths["events"].exists())
            self.assertFalse(paths["stderr"].exists())
            self.assertFalse(paths["receipt"].exists())

    def test_output_alias_collision_rejected_before_write(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            runner = FakeRunner()
            real_realpath = os.path.realpath

            def aliased(path, *args, **kwargs):
                resolved = real_realpath(path, *args, **kwargs)
                if resolved == str(paths["receipt"]):
                    return str(paths["events"])
                return resolved

            with patch.object(launcher.os.path, "realpath", side_effect=aliased):
                with self.assertRaises(SystemExit) as caught:
                    launcher.main(args, runner=runner)

            self.assertIn("collide", str(caught.exception))
            self.assertEqual(runner.calls, [])
            self.assertFalse(paths["events"].exists())
            self.assertFalse(paths["receipt"].exists())

    def test_successful_receipt_records_usage_and_final_text(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            runner = FakeRunner(stdout=jsonl(THREAD_STARTED, AGENT_DONE, TURN_COMPLETED), result="done")

            code = launcher.main(args, runner=runner)

            self.assertEqual(code, 0)
            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertTrue(receipt["success"])
            self.assertTrue(receipt["completed"])
            self.assertTrue(receipt["final_text"])
            self.assertEqual(receipt["exit_code"], 0)
            self.assertEqual(receipt["thread_id"], "thread-1")
            self.assertEqual(receipt["session_id"], "session-1")
            self.assertEqual(receipt["usage"], {"input_tokens": 10, "output_tokens": 3, "total_tokens": 13})
            self.assertEqual(receipt["model"], PROFILE_VALUES["model"])
            self.assertEqual(receipt["provider"], "ollama-code-worker")
            self.assertEqual(receipt["final_text_length"], len("done"))
            self.assertEqual(receipt["final_text_source"], "output-last-message")
            self.assertEqual(receipt["final_text_path"], str(paths["result"].resolve()))
            self.assertTrue(receipt["final_text_consistent"])
            self.assertIsNone(receipt["error"])
            self.assertEqual(receipt["malformed_event_count"], 0)
            self.assertEqual(receipt["mode"], "fresh")
            self.assertEqual(paths["result"].read_text(encoding="utf-8"), "done")

    def test_receipt_records_distinct_invocation_ids_for_fresh_and_resume(self):
        with tempfile.TemporaryDirectory() as root:
            fresh_args, fresh_paths = self.make_args(root)
            fresh_runner = FakeRunner(stdout=jsonl(THREAD_STARTED, AGENT_DONE, TURN_COMPLETED), result="done")
            self.assertEqual(launcher.main(fresh_args, runner=fresh_runner), 0)
            fresh = json.loads(fresh_paths["receipt"].read_text(encoding="utf-8"))

            resume_root = Path(root) / "resume"
            resume_root.mkdir()
            resume_args, resume_paths = self.make_args(str(resume_root), resume="session-1")
            resumed = {"type": "thread.started", "thread_id": "thread-1", "session_id": "session-1"}
            resume_runner = FakeRunner(stdout=jsonl(resumed, AGENT_DONE, TURN_COMPLETED), result="done")
            self.assertEqual(launcher.main(resume_args, runner=resume_runner), 0)
            again = json.loads(resume_paths["receipt"].read_text(encoding="utf-8"))

            self.assertEqual(fresh["mode"], "fresh")
            self.assertEqual(again["mode"], "resume")
            self.assertEqual(fresh["session_id"], again["session_id"])
            self.assertTrue(fresh["invocation_id"])
            self.assertTrue(again["invocation_id"])
            self.assertNotEqual(fresh["invocation_id"], again["invocation_id"])

    def test_output_last_message_used_as_fallback(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            runner = FakeRunner(stdout=jsonl(THREAD_STARTED, TURN_COMPLETED), result="fallback text")

            code = launcher.main(args, runner=runner)

            self.assertEqual(code, 0)
            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertTrue(receipt["success"])
            self.assertEqual(receipt["final_text_source"], "output-last-message")
            self.assertEqual(receipt["final_text_path"], str(paths["result"].resolve()))
            self.assertEqual(receipt["final_text_length"], len("fallback text"))
            self.assertIsNone(receipt["final_text_consistent"])

    def test_empty_agent_message_does_not_make_output_inconsistent(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            runner = FakeRunner(
                stdout=jsonl(
                    THREAD_STARTED,
                    {"type": "item.completed", "item": {"type": "agent_message", "text": ""}},
                    TURN_COMPLETED,
                ),
                result="fallback after empty event",
            )

            code = launcher.main(args, runner=runner)

            self.assertEqual(code, 0)
            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertTrue(receipt["success"])
            self.assertEqual(receipt["final_text_source"], "output-last-message")
            self.assertEqual(receipt["final_text_path"], str(paths["result"].resolve()))
            self.assertEqual(receipt["final_text_length"], len("fallback after empty event"))
            self.assertIsNone(receipt["final_text_consistent"])

    def test_nonempty_agent_message_cannot_replace_empty_output_last_message(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            runner = FakeRunner(
                stdout=jsonl(
                    THREAD_STARTED,
                    {"type": "item.completed", "item": {"type": "agent_message", "text": "earlier commentary"}},
                    TURN_COMPLETED,
                ),
                result="",
            )

            code = launcher.main(args, runner=runner)

            self.assertNotEqual(code, 0)
            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertFalse(receipt["success"])
            self.assertTrue(receipt["completed"])
            self.assertFalse(receipt["final_text"])
            self.assertIsNone(receipt["final_text_source"])
            self.assertIn("nonempty final text", receipt["error"])

    def test_agent_message_mismatch_with_output_last_message_fails(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            runner = FakeRunner(
                stdout=jsonl(THREAD_STARTED, AGENT_DONE, TURN_COMPLETED),
                result="different final answer",
            )

            code = launcher.main(args, runner=runner)

            self.assertNotEqual(code, 0)
            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertFalse(receipt["success"])
            self.assertTrue(receipt["completed"])
            self.assertTrue(receipt["final_text"])
            self.assertEqual(receipt["final_text_source"], "output-last-message")
            self.assertEqual(receipt["final_text_path"], str(paths["result"].resolve()))
            self.assertFalse(receipt["final_text_consistent"])
            self.assertIn("does not match agent_message", receipt["error"])

    def test_nonzero_child_failure_writes_receipt_and_returns_code(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            runner = FakeRunner(
                stdout=jsonl(THREAD_STARTED, {"type": "turn.failed", "message": "backend exploded"}),
                stderr="boom\n",
                code=1,
            )

            code = launcher.main(args, runner=runner)

            self.assertEqual(code, 1)
            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertFalse(receipt["success"])
            self.assertEqual(receipt["exit_code"], 1)
            self.assertFalse(receipt["completed"])
            self.assertFalse(receipt["final_text"])
            self.assertIn("backend exploded", receipt["error"])
            self.assertEqual(paths["stderr"].read_text(encoding="utf-8"), "boom\n")

    def test_launch_error_still_writes_failure_receipt(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            runner = FakeRunner(error=OSError("codex.exe missing"))

            code = launcher.main(args, runner=runner)

            self.assertNotEqual(code, 0)
            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertFalse(receipt["success"])
            self.assertIsNone(receipt["exit_code"])
            self.assertIn("codex.exe missing", receipt["error"])
            self.assertFalse(receipt["completed"])
            self.assertTrue(paths["receipt"].exists())

    def test_exit_zero_without_turn_completed_returns_nonzero(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            runner = FakeRunner(stdout=jsonl(THREAD_STARTED), result="done")

            code = launcher.main(args, runner=runner)

            self.assertNotEqual(code, 0)
            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertFalse(receipt["success"])
            self.assertEqual(receipt["exit_code"], 0)
            self.assertFalse(receipt["completed"])
            self.assertIn("turn.completed", receipt["error"])

    def test_exit_zero_with_empty_final_text_returns_nonzero(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            runner = FakeRunner(
                stdout=jsonl(THREAD_STARTED, {"type": "item.completed", "item": {"type": "agent_message", "text": ""}}, TURN_COMPLETED),
                result="",
            )

            code = launcher.main(args, runner=runner)

            self.assertNotEqual(code, 0)
            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertFalse(receipt["success"])
            self.assertTrue(receipt["completed"])
            self.assertFalse(receipt["final_text"])
            self.assertIn("nonempty final text", receipt["error"])

    def test_malformed_jsonl_does_not_crash_receipt_reporting(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            stdout = jsonl(THREAD_STARTED, "{not json", "[1, 2, 3]", AGENT_DONE, "null", TURN_COMPLETED)
            runner = FakeRunner(stdout=stdout, result="done")

            code = launcher.main(args, runner=runner)

            self.assertEqual(code, 0)
            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertTrue(receipt["success"])
            self.assertGreaterEqual(receipt["malformed_event_count"], 3)
            self.assertEqual(paths["events"].read_text(encoding="utf-8"), stdout)

    def test_malformed_only_output_fails_with_receipt(self):
        with tempfile.TemporaryDirectory() as root:
            args, paths = self.make_args(root)
            runner = FakeRunner(stdout="this is not json\n", stderr="")

            code = launcher.main(args, runner=runner)

            self.assertNotEqual(code, 0)
            receipt = json.loads(paths["receipt"].read_text(encoding="utf-8"))
            self.assertFalse(receipt["success"])
            self.assertEqual(receipt["malformed_event_count"], 1)
            self.assertIn("turn.completed", receipt["error"])


if __name__ == "__main__":
    unittest.main()
