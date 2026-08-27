# GGUF Context Patcher
# Reduces baked-in context_length in GGUF files from 262144 to a smaller value.
# Metadata-only change — no model weights are touched.
# Run: python patch-gguf-ctx.py [32768|65536]

import struct, sys, os

TARGET = int(sys.argv[1]) if len(sys.argv) > 1 else 32768

PATCHES = {
    "Qwen3.8-27B-UD-Q5_K_XL": {
        "path": r"C:\Users\scott\.lmstudio\models\unsloth\Qwen3.8-27B-GGUF\Qwen3.8-27B-UD-Q5_K_XL.gguf",
        "key": b"qwen35.context_length",
        "value_offset": 984,  # verified 2026-08-27
    },
    "Qwen3-Coder-30B-A3B-Instruct-Q4_K_S": {
        "path": r"C:\Users\scott\.lmstudio\models\unsloth\Qwen3-Coder-30B-A3B-Instruct-GGUF\Qwen3-Coder-30B-A3B-Instruct-Q4_K_S.gguf",
        "key": b"qwen3moe.context_length",
        "value_offset": 1014,  # verified 2026-08-27
    },
}

for name, cfg in PATCHES.items():
    path = cfg["path"]
    if not os.path.exists(path):
        print(f"SKIP {name}: file not found at {path}")
        continue
    offset = cfg["value_offset"]
    with open(path, "r+b") as f:
        f.seek(offset)
        old = struct.unpack("<I", f.read(4))[0]
        print(f"{name}: {old} -> {TARGET}")
        f.seek(offset)
        f.write(struct.pack("<I", TARGET))
        f.seek(offset)
        verify = struct.unpack("<I", f.read(4))[0]
        assert verify == TARGET, f"FAILED: wrote {TARGET}, read {verify}"
print("Done. Unload and reload models to pick up new context.")
