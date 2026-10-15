# DSH generation-speed reporting repair — October 15, 2026

## Confirmed cause
DSH Web and Desktop shared a throughput calculation that divided provider output-token counts by the interval from the first assistant stream event to completion. Gufo delivered tool-call arguments together near completion. DSH counted those tokens against only milliseconds of apparent generation time, inflating the session rate. This is a timing-assumption bug, not evidence of deliberate inflation.

The calculation is provider-independent and can affect LM Studio, Ollama, or cloud routes when their tool calls are buffered similarly. Inflation was demonstrated using saved Gufo jobs only; no LM Studio/Ollama inflation is claimed as measured.

## Scoped change
The session-stats projection and chat fallback exclude responses containing tool calls from the inferred generation-rate totals. Trajectory marks their speed as not measurable. Text speed is labelled `tok/s (text)`. Projection version advances to rebuild old cached statistics from the unchanged journals. Usage, billing tokens, step counts, timing, model catalogs, and defaults are preserved.

This measures client-observed text streaming. It is not engine-reported throughput. Excluding all tool-call-containing responses is conservative, including for providers that stream tool calls. No exact engine timing is inferred for buffered delivery.

## Verification using existing records only
| Saved Gufo job | Original rate | Corrected text rate |
| --- | ---: | ---: |
| Q6 library | 12.92 | 8.39 |
| Q4 library | 40.68 | 26.43 |
| Coding | 75.90 | 22.86 |
| Web library | 10.31 | 8.27 |

Both apps' actual calculation code was replayed against those four saved jobs. Turn counts, step counts, model time and tool time remained unchanged. After restarting the idle apps, Desktop visibly showed `23 tok/s (text)` on the existing coding job; Web showed `8.3 tok/s (text)` on the existing library job. No new model requests or benchmarks were run.

## Deployment and recovery
Canonical repair: `stack/stock-dsh/repair-generation-speed.mjs`. Run with Node and `--apply` to repair the matching installed builds; without that flag it prepares backups and a manifest without changing runtime files. Exact source guards refuse unexpected versions; marker makes application idempotent.

Web: three installed session-stats/chat/trajectory JavaScript files. Desktop: the same three entries within its app.asar, with updated ASAR offsets and SHA-256 integrity. Original payloads remain in the archive. All six original files and the original Desktop archive are backed up locally under `C:\Users\scott\Documents\Codex\2026-10-15\dsh-speed-reporting`.

For rollback, quit the idle apps and restore the three Web originals and `app.asar.before-speed-repair` to their corresponding installed paths. These runtime changes may be overwritten by a DSH upgrade; they are not an upstream fix or an automatic upgrade hook. Recovery copies include the repair script and measured replay results; the large archive backup remains local, outside Git.
