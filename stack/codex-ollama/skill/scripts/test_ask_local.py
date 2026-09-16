import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError

import ask_local


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()
        return False


class FakeHTTP:
    def __init__(self, models, loaded_models=None, stream=b"", chat_error=None):
        self.models = models
        self.loaded_models = loaded_models
        self.stream = stream
        self.chat_error = chat_error
        self.calls = []
        self.load_count = 0

    def __call__(self, request, timeout=None):
        body = None
        if request.data is not None:
            body = json.loads(request.data.decode("utf-8"))
        self.calls.append(
            {
                "url": request.full_url,
                "method": request.method,
                "body": body,
                "timeout": timeout,
            }
        )

        if request.full_url == ask_local.MODEL_API_URL:
            payload = self.models
            if self.load_count and self.loaded_models is not None:
                payload = self.loaded_models
            return FakeResponse(json.dumps(payload).encode("utf-8"))
        if request.full_url == ask_local.LOAD_API_URL:
            self.load_count += 1
            return FakeResponse(b'{"status":"loaded"}')
        if request.full_url == ask_local.CHAT_API_URL:
            if self.chat_error is not None:
                raise self.chat_error
            return FakeResponse(self.stream)
        raise AssertionError(f"unexpected URL: {request.full_url}")


def models_payload(model_key, instance_id=None):
    loaded = []
    if instance_id is not None:
        loaded.append({"id": instance_id})
    return {"data": [{"key": model_key, "loaded_instances": loaded}]}


def sse(*chunks, model=None):
    lines = []
    for chunk in chunks:
        payload = dict(chunk)
        if model is not None:
            payload["model"] = model
        lines.append("data: " + json.dumps(payload) + "\n\n")
    lines.append("data: [DONE]\n\n")
    return "".join(lines).encode("utf-8")


def final_chunk(finish_reason="stop"):
    return {"choices": [{"delta": {}, "finish_reason": finish_reason}]}


def valid_stream(model=None):
    return sse(
        {"choices": [{"delta": {"content": "ok"}, "finish_reason": None}]},
        final_chunk(),
        model=model,
    )


class AskLocalTests(unittest.TestCase):
    def test_brain_defaults_high_reuses_instance_and_separates_reasoning_usage(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            context = Path(root) / "context.txt"
            output = Path(root) / "answer.txt"
            prompt.write_text("Do the thing.", encoding="utf-8")
            context.write_text("Context body.", encoding="utf-8")

            stream = sse(
                {
                    "choices": [
                        {
                            "delta": {"reasoning_content": "private reasoning"},
                            "finish_reason": None,
                        }
                    ]
                },
                {
                    "choices": [
                        {"delta": {"content": "Hello "}, "finish_reason": None}
                    ]
                },
                {
                    "choices": [
                        {"delta": {"content": "world"}, "finish_reason": "stop"}
                    ]
                },
                {
                    "choices": [],
                    "usage": {
                        "prompt_tokens": 10,
                        "completion_tokens": 2,
                        "total_tokens": 12,
                    },
                },
            )
            opener = FakeHTTP(
                models_payload(ask_local.MODEL_KEYS["brain"], "brain-instance"),
                stream=stream,
            )

            result = ask_local.main(
                [
                    "--role",
                    "brain",
                    "--prompt-file",
                    str(prompt),
                    "--context-file",
                    str(context),
                    "--output-file",
                    str(output),
                ],
                opener=opener,
            )

            self.assertEqual(result, 0)
            self.assertEqual(output.read_text(encoding="utf-8"), "Hello world")
            receipt = json.loads(
                output.with_suffix(".receipt.json").read_text(encoding="utf-8")
            )
            self.assertEqual(receipt["requested_model"], ask_local.MODEL_KEYS["brain"])
            self.assertEqual(receipt["requested_instance_id"], "brain-instance")
            self.assertIsNone(receipt["response_model"])
            self.assertEqual(receipt["reasoning_effort"], "high")
            self.assertEqual(receipt["usage"]["total_tokens"], 12)
            self.assertEqual(receipt["reasoning_character_count"], len("private reasoning"))
            self.assertIsNone(receipt["newly_loaded_instance"])

            chat_calls = [
                call for call in opener.calls if call["url"] == ask_local.CHAT_API_URL
            ]
            self.assertEqual(len(chat_calls), 1)
            payload = chat_calls[0]["body"]
            self.assertEqual(payload["reasoning_effort"], "high")
            self.assertTrue(payload["stream"])
            self.assertEqual(payload["stream_options"], {"include_usage": True})
            self.assertEqual(payload["max_tokens"], 8192)
            message = payload["messages"][0]["content"]
            self.assertIn("Context 1 (" + str(context) + "):", message)
            self.assertIn("Context body.", message)

    def test_brain_explicit_none_is_sent(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            output = Path(root) / "answer.txt"
            prompt.write_text("Say hello.", encoding="utf-8")
            opener = FakeHTTP(
                models_payload(ask_local.MODEL_KEYS["brain"], "brain-instance"),
                stream=valid_stream(),
            )

            result = ask_local.main(
                [
                    "--role",
                    "brain",
                    "--prompt-file",
                    str(prompt),
                    "--reasoning",
                    "none",
                    "--output-file",
                    str(output),
                ],
                opener=opener,
            )

            self.assertEqual(result, 0)
            chat = [call for call in opener.calls if call["url"] == ask_local.CHAT_API_URL][0]
            self.assertEqual(chat["body"]["reasoning_effort"], "none")

    def test_coder_omits_reasoning_field(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            output = Path(root) / "answer.txt"
            prompt.write_text("Write code.", encoding="utf-8")
            opener = FakeHTTP(
                models_payload(ask_local.MODEL_KEYS["coder"], "coder-instance"),
                stream=valid_stream(),
            )

            result = ask_local.main(
                [
                    "--role",
                    "coder",
                    "--prompt-file",
                    str(prompt),
                    "--output-file",
                    str(output),
                ],
                opener=opener,
            )

            self.assertEqual(result, 0)
            chat = [call for call in opener.calls if call["url"] == ask_local.CHAT_API_URL][0]
            self.assertNotIn("reasoning_effort", chat["body"])
            receipt = json.loads(
                output.with_suffix(".receipt.json").read_text(encoding="utf-8")
            )
            self.assertIsNone(receipt["reasoning_effort"])

    def test_coder_rejects_explicit_reasoning_without_writing(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            output = Path(root) / "answer.txt"
            prompt.write_text("Write code.", encoding="utf-8")
            output.write_text("existing output", encoding="utf-8")
            opener = FakeHTTP(models_payload(ask_local.MODEL_KEYS["coder"], "coder-instance"))

            result = ask_local.main(
                [
                    "--role",
                    "coder",
                    "--prompt-file",
                    str(prompt),
                    "--reasoning",
                    "high",
                    "--output-file",
                    str(output),
                ],
                opener=opener,
            )

            self.assertNotEqual(result, 0)
            self.assertEqual(output.read_text(encoding="utf-8"), "existing output")
            self.assertEqual(opener.calls, [])

    def test_missing_instance_loads_model_with_model_only_and_records_identity(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            output = Path(root) / "answer.txt"
            prompt.write_text("Write code.", encoding="utf-8")
            key = ask_local.MODEL_KEYS["coder"]
            opener = FakeHTTP(
                models_payload(key),
                loaded_models=models_payload(key, "coder-instance"),
                stream=valid_stream(),
            )

            result = ask_local.main(
                [
                    "--role",
                    "coder",
                    "--prompt-file",
                    str(prompt),
                    "--output-file",
                    str(output),
                ],
                opener=opener,
            )

            self.assertEqual(result, 0)
            load_calls = [
                call for call in opener.calls if call["url"] == ask_local.LOAD_API_URL
            ]
            self.assertEqual(len(load_calls), 1)
            self.assertEqual(load_calls[0]["method"], "POST")
            self.assertEqual(load_calls[0]["body"], {"model": key})
            self.assertEqual(load_calls[0]["timeout"], 180.0)
            receipt = json.loads(
                output.with_suffix(".receipt.json").read_text(encoding="utf-8")
            )
            self.assertEqual(receipt["requested_instance_id"], "coder-instance")
            self.assertIsNone(receipt["response_model"])
            self.assertEqual(receipt["newly_loaded_instance"], "coder-instance")
            self.assertFalse(any("unload" in call["url"].lower() for call in opener.calls))

    def test_receipt_records_actual_stream_model_separately_from_instance(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            output = Path(root) / "answer.txt"
            prompt.write_text("Say hello.", encoding="utf-8")
            opener = FakeHTTP(
                models_payload(ask_local.MODEL_KEYS["brain"], "brain-instance"),
                stream=valid_stream(model="qwen3.6-response-id"),
            )

            result = ask_local.main(
                ["--role", "brain", "--prompt-file", str(prompt), "--output-file", str(output)],
                opener=opener,
            )

            self.assertEqual(result, 0)
            receipt = json.loads(output.with_suffix(".receipt.json").read_text(encoding="utf-8"))
            self.assertEqual(receipt["requested_model"], ask_local.MODEL_KEYS["brain"])
            self.assertEqual(receipt["requested_instance_id"], "brain-instance")
            self.assertEqual(receipt["response_model"], "qwen3.6-response-id")

    def test_empty_content_error_chunk_and_unsupported_finish_preserve_output(self):
        cases = {
            "empty content": sse(final_chunk()),
            "error chunk": sse({"error": {"message": "backend failed"}}),
            "error event": b"event: error\ndata: {\"message\":\"backend failed\"}\n\n",
            "unsupported finish": sse(final_chunk("tool_calls")),
        }
        for name, stream in cases.items():
            with self.subTest(name=name), tempfile.TemporaryDirectory() as root:
                prompt = Path(root) / "prompt.txt"
                output = Path(root) / "answer.txt"
                receipt = output.with_suffix(".receipt.json")
                prompt.write_text("Prompt.", encoding="utf-8")
                output.write_text("keep output", encoding="utf-8")
                receipt.write_text("keep receipt", encoding="utf-8")
                opener = FakeHTTP(
                    models_payload(ask_local.MODEL_KEYS["brain"], "brain-instance"),
                    stream=stream,
                )

                result = ask_local.main(
                    ["--role", "brain", "--prompt-file", str(prompt), "--output-file", str(output)],
                    opener=opener,
                )

                self.assertNotEqual(result, 0)
                self.assertEqual(output.read_text(encoding="utf-8"), "keep output")
                self.assertEqual(receipt.read_text(encoding="utf-8"), "keep receipt")

    def test_paths_colliding_with_output_receipt_or_inputs_fail_before_inference(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            context = Path(root) / "context.txt"
            prompt.write_text("Prompt.", encoding="utf-8")
            context.write_text("Context.", encoding="utf-8")
            receipt_prompt = Path(root) / "receipt-input.receipt.json"
            receipt_prompt.write_text("Prompt.", encoding="utf-8")
            cases = [
                (str(prompt), str(prompt), []),
                (str(context), str(prompt), [str(context)]),
                (str(Path(root) / "receipt-input"), str(receipt_prompt), []),
            ]
            for output_name, prompt_name, contexts in cases:
                with self.subTest(output=output_name):
                    opener = FakeHTTP(models_payload(ask_local.MODEL_KEYS["coder"], "coder-instance"))
                    result = ask_local.main(
                        [
                            "--role", "coder", "--prompt-file", prompt_name,
                            *sum((["--context-file", item] for item in contexts), []),
                            "--output-file", output_name,
                        ],
                        opener=opener,
                    )
                    self.assertNotEqual(result, 0)
                    self.assertEqual(opener.calls, [])

    def test_canonical_path_resolves_alias_for_input_collision(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            output = Path(root) / "answer.txt"
            prompt.write_text("Prompt.", encoding="utf-8")

            realpath = os.path.realpath

            def simulated_realpath(path):
                if Path(path) == output:
                    return str(prompt)
                return realpath(path)

            opener = FakeHTTP(models_payload(ask_local.MODEL_KEYS["coder"], "coder-instance"))
            with patch("ask_local.os.path.realpath", side_effect=simulated_realpath):
                result = ask_local.main(
                    [
                        "--role",
                        "coder",
                        "--prompt-file",
                        str(prompt),
                        "--output-file",
                        str(output),
                    ],
                    opener=opener,
                )

            self.assertNotEqual(result, 0)
            self.assertEqual(opener.calls, [])
            self.assertEqual(prompt.read_text(encoding="utf-8"), "Prompt.")
            self.assertFalse(output.exists())

    def test_nonpositive_max_tokens_fails_before_inference(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            output = Path(root) / "answer.txt"
            prompt.write_text("Prompt.", encoding="utf-8")
            opener = FakeHTTP(models_payload(ask_local.MODEL_KEYS["coder"], "coder-instance"))
            result = ask_local.main(
                [
                    "--role", "coder", "--prompt-file", str(prompt),
                    "--max-tokens", "0", "--output-file", str(output),
                ],
                opener=opener,
            )
            self.assertNotEqual(result, 0)
            self.assertEqual(opener.calls, [])

    def test_pair_write_failure_restores_existing_receipt_and_output(self):
        with tempfile.TemporaryDirectory() as root:
            receipt = Path(root) / "answer.receipt.json"
            output = Path(root) / "answer.txt"
            receipt.write_text("old receipt", encoding="utf-8")
            output.write_text("old answer", encoding="utf-8")
            original_replace = ask_local.os.replace
            calls = 0

            def fail_second_replace(source, target):
                nonlocal calls
                calls += 1
                if calls == 2:
                    raise OSError("simulated output replacement failure")
                return original_replace(source, target)

            with patch("ask_local.os.replace", side_effect=fail_second_replace):
                with self.assertRaisesRegex(OSError, "simulated output replacement failure"):
                    ask_local.atomic_write_pair(receipt, "new receipt", output, "new answer")

            self.assertEqual(receipt.read_text(encoding="utf-8"), "old receipt")
            self.assertEqual(output.read_text(encoding="utf-8"), "old answer")

    def test_pair_write_rejects_same_target(self):
        with tempfile.TemporaryDirectory() as root:
            output = Path(root) / "same.txt"
            with self.assertRaisesRegex(ask_local.AskLocalError, "must be different"):
                ask_local.atomic_write_pair(output, "first", output, "second")
            self.assertFalse(output.exists())

    def test_malformed_stream_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            output = Path(root) / "answer.txt"
            receipt = output.with_suffix(".receipt.json")
            prompt.write_text("Prompt.", encoding="utf-8")
            output.write_text("keep output", encoding="utf-8")
            receipt.write_text("keep receipt", encoding="utf-8")
            opener = FakeHTTP(
                models_payload(ask_local.MODEL_KEYS["brain"], "brain-instance"),
                stream=b"data: {not-json}\n\n",
            )

            result = ask_local.main(
                [
                    "--role",
                    "brain",
                    "--prompt-file",
                    str(prompt),
                    "--output-file",
                    str(output),
                ],
                opener=opener,
            )

            self.assertNotEqual(result, 0)
            self.assertEqual(output.read_text(encoding="utf-8"), "keep output")
            self.assertEqual(receipt.read_text(encoding="utf-8"), "keep receipt")

    def test_truncated_stream_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            output = Path(root) / "answer.txt"
            prompt.write_text("Prompt.", encoding="utf-8")
            output.write_text("keep output", encoding="utf-8")
            stream = (
                b'data: {"choices":[{"delta":{"content":"partial"},'
                b'"finish_reason":"stop"}]}\n\n'
            )
            opener = FakeHTTP(
                models_payload(ask_local.MODEL_KEYS["brain"], "brain-instance"),
                stream=stream,
            )

            result = ask_local.main(
                [
                    "--role",
                    "brain",
                    "--prompt-file",
                    str(prompt),
                    "--output-file",
                    str(output),
                ],
                opener=opener,
            )

            self.assertNotEqual(result, 0)
            self.assertEqual(output.read_text(encoding="utf-8"), "keep output")

    def test_length_finish_reason_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            output = Path(root) / "answer.txt"
            prompt.write_text("Prompt.", encoding="utf-8")
            output.write_text("keep output", encoding="utf-8")
            opener = FakeHTTP(
                models_payload(ask_local.MODEL_KEYS["brain"], "brain-instance"),
                stream=sse(final_chunk("length")),
            )

            result = ask_local.main(
                [
                    "--role",
                    "brain",
                    "--prompt-file",
                    str(prompt),
                    "--output-file",
                    str(output),
                    "--max-tokens",
                    "8",
                ],
                opener=opener,
            )

            self.assertNotEqual(result, 0)
            self.assertEqual(output.read_text(encoding="utf-8"), "keep output")
            chat = [call for call in opener.calls if call["url"] == ask_local.CHAT_API_URL][0]
            self.assertEqual(chat["body"]["max_tokens"], 8)

    def test_http_error_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            output = Path(root) / "answer.txt"
            prompt.write_text("Prompt.", encoding="utf-8")
            output.write_text("keep output", encoding="utf-8")
            error = HTTPError(
                ask_local.CHAT_API_URL,
                500,
                "server error",
                hdrs=None,
                fp=io.BytesIO(b"backend failed"),
            )
            opener = FakeHTTP(
                models_payload(ask_local.MODEL_KEYS["brain"], "brain-instance"),
                chat_error=error,
            )

            result = ask_local.main(
                [
                    "--role",
                    "brain",
                    "--prompt-file",
                    str(prompt),
                    "--output-file",
                    str(output),
                ],
                opener=opener,
            )

            self.assertNotEqual(result, 0)
            self.assertEqual(output.read_text(encoding="utf-8"), "keep output")

    def test_network_error_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as root:
            prompt = Path(root) / "prompt.txt"
            output = Path(root) / "answer.txt"
            prompt.write_text("Prompt.", encoding="utf-8")
            output.write_text("keep output", encoding="utf-8")
            opener = FakeHTTP(
                models_payload(ask_local.MODEL_KEYS["brain"], "brain-instance"),
                chat_error=URLError("connection refused"),
            )

            result = ask_local.main(
                [
                    "--role",
                    "brain",
                    "--prompt-file",
                    str(prompt),
                    "--output-file",
                    str(output),
                ],
                opener=opener,
            )

            self.assertNotEqual(result, 0)
            self.assertEqual(output.read_text(encoding="utf-8"), "keep output")


if __name__ == "__main__":
    unittest.main()
