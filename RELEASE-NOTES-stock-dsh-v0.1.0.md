# Stock DSH for Halo v0.1.0

This release retires the prior custom Halo runtime and establishes the supported Halo deployment on stock DeepSeek Harness `0.1.5-rc.2`.

## Runtime behavior

- Keeps `halo-coder-q4km` as the default local agent.
- Retains `halo-brain-35b` for planning, synthesis, and vision.
- Declares the real 32K runtime capacity and input modalities for each model.
- Makes startup converge LM Studio to exactly the approved two-model set and repairs a wrong context or parallel-slot load.
- Uses Wigolo first and exposes DSH native web tools as the bounded fallback.
- Preserves full local Windows access through the configured DSH permission preset.

## Recovery

The tag `pre-stock-dsh-cleanup-2026-09-13` preserves the final committed state before this cleanup. Downloaded model weights are not removed by this release.
