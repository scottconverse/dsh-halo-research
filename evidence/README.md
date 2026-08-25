# Evidence index

Every artefact here was produced on the target machine on **2026-08-23**, or fetched from a
registry/vendor API on that date. The report cites these by filename.

## Machine state

| File | What it proves |
|---|---|
| `machine-baseline.txt` | CPU, 8×16 GB LPDDR5X-8000, GPU + driver 32.0.31035.1003, BIOS 03.03, Windows 25H2 build 26200.9168, storage |
| `dxdiag.txt` | **Dedicated 65,360 MB / Shared 48,938 MB / Display total 114,298 MB** — the VGM split |
| `clinfo.txt` | **OpenCL global 99.84 GiB, max single allocation 54.40 GiB**, 20 WGPs |
| `vulkaninfo-summary.txt` | Vulkan device API 1.4.349, AMD proprietary driver, LLPC 26.7.1 |

## DeepSeek Harness

| File | What it proves |
|---|---|
| `dsh-packages-full.csv` | **227 packages** across 50 categories; 225 published, 2 private |
| `dump-default-web.txt` | The composed **stock** `web` profile — no user layer |
| `dump-default-web-plugins.txt` | **133** distinct packages in that composition |
| `composed-web-plugins.txt` | Same set derived independently from the bundle patch files (cross-check) |
| `composed-headless-plugins.txt` | **78** packages in the headless composition |
| `npm-dsh-packument.json` | npm metadata: `0.1.1-rc.2` is both `latest` and `next`, MIT, 62 direct dependencies |
| `dsh-scope-packages.tsv` | npm scope listing (incomplete — the registry search API rate-limited at 429; the repo walk above is authoritative) |

Upstream source read from a shallow clone at commit
**`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`** in `../_upstream/deepseek-harness`.

## Models and serving

| File | What it proves |
|---|---|
| `lms-ps.json` | Resident model, quantization, context — the authoritative residency readout |
| `lms-ls.txt` | 41 models, 549.14 GB on disk |
| `PRE-SWITCH-lms-ps.json` | Exact model state recorded **before** the ROCm experiment, used to restore it |
| `PRE-SWITCH-runtimes.txt` | Selected runtime before the experiment |

## Benchmarks

Run with `../bench/Bench-Local.ps1`.

| File | Status |
|---|---|
| `bench-vulkan-2.29.1-clean-*.csv` | **ACCEPTED** — warmed, cache-defeated, uncontended |
| `bench-rocm-2.29.1-*.csv` | **ACCEPTED** — warmed, cache-defeated, uncontended |
| `bench-vulkan-2.29.1-warm-*.csv` | **DISCARDED** — contended (probes issued mid-run) |
| `bench-vulkan-2.29.1-nocache-*.csv` | **DISCARDED** — contended |
| `bench-vulkan-2.29.1-*.csv` (first) | **DISCARDED** — shared prompt prefix; measured the prompt cache |

The discarded runs are kept deliberately. They are the evidence for the methodology warnings in
§17.2, and deleting them would hide the fact that the first three attempts were wrong.

## Reproducing

```powershell
.\bench\Bench-Local.ps1 -Label mylabel -Model qwen/qwen3.8-27b -PromptKb 8,32,64,256
```

Nothing else may touch the server while it runs — the model is loaded with `parallel: 1`, so a
single concurrent request inflates every subsequent TTFT.
