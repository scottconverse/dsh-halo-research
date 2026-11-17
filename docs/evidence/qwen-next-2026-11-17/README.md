# Qwen Next on Strix Halo and Blackwell

The November 17, 2026 field study compares llama.cpp build 12359 and Strata 0.1.59 on one Qwen3.8-Flash-Next GSQ-RCO / IQ3_S model. It covers 72 requests across 13 configurations, including a two-host RPC test. The publication reuses saved results and required no new model runs or runtime changes.

- [Published HTML report](https://scottconverse.github.io/dsh-halo-research/benchmarks/qwen-next-2026-11-17/)
- [Report source](../../../site/benchmarks/qwen-next-2026-11-17/index.html)
- [Benchmark evidence package](Qwen-Next-Halo-Blackwell-Report.zip)
- [Data verification](data-verification.json), [headless verification](headless-verification.json) and [artifact checksums](delivery-verification.json)

The ZIP contains the HTML, eight figures in SVG and PNG, full-precision data tables, 29 byte-preserved result/calibration files, provenance and generation source. Some original machine logs are represented by hashes and selected fields. Rebuilding from source requires the retained original evidence tree.

The site build explicitly includes the HTML and checks the report link under the GitHub Pages project path. The archive remains available through the repository. The original HTML SHA-256 is `5626f638d92f3343c986de708549c0f9bbfa5e28430253afd268cb7ba2f50367`. The ZIP SHA-256 is `c6e725fa8a4554a456d564b93450f4e1abc08ba6708e5948e7f52383721d9faf`.
