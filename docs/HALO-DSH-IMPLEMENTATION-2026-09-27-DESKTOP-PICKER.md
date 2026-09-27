# Native DSH Desktop picker correction — 2026-09-27

## Delivered scope

This changes native **DSH Desktop**, rooted at
`C:\Users\scott\Documents\Codex\2026-09-25\dsh-desktop-eval`.
Web DSH's profile and running process were not changed. The shared native CLI
adapter gained optional Claude catalog metadata; without that Desktop-only
configuration it retains its previous Claude aliases. No local models were
loaded or unloaded during this change.

The Desktop launcher now selects `lmstudio-library / halo/qwen3.8-27b-q4km`
with Xhigh as its startup default, without changing residency. A fresh visible
Desktop chat verified that selection. Existing chats keep their own selection;
manual picker choices can persist during the running instance. The launch-time
catalog refresh preserves the exclusions below instead of repopulating them.

## Picker contents and reasoning

Only these five Ollama Cloud rows remain, in Scott's approved order:

| Model | Effort menu, excluding the stock Default choice |
| --- | --- |
| deepseek-v4.1-flash:cloud | Off, Low, High, Max |
| glm-5.3:cloud | Low, High, Max |
| kimi-k3:cloud | Off, Low, High, Max |
| minimax-m3:cloud | Provider default; no verified configurable levels |
| glm-5.3-flash:cloud | Low, High, Max |

Evidence is the installed Ollama server's `/api/show` response, saved in
`stack/desktop-tuning/evidence/ollama-thinking-metadata.json`. MiniMax advertises
thinking capability but returns no `thinking.values`. This is not evidence that
it cannot think, nor proof that an accepted parameter changes its behavior. No
Low/Medium/High menu was invented for it. Vision inputs were retained where the
same metadata advertises vision.

Other available routes:

| Model/route | Effort choices |
| --- | --- |
| Qwen3.8 27B Q4 and Q6, LM Studio | Off, Low, Medium, Xhigh |
| Qwen3.8 27B Q4, Ollama local | Off, Low, Medium, Xhigh |
| Qwen3.6 35B, LM Studio/Ollama local | Off, High (High is the wire mapping for binary thinking On) |
| Qwen3 Coder 30B | No thinking control; non-thinking model |
| Claude Opus 5.5 and Sonnet 5 | Low, Medium, High, Xhigh, Max |
| Claude Haiku 4.5 | No effort control |
| GPT-5.6-Sol / GPT-5.6-Terra | Low, Medium, High, Xhigh, Max, Ultra |
| GPT-5.6-Luna | Low, Medium, High, Xhigh, Max |
| GPT-5.5 | Low, Medium, High, Xhigh |

Qwen levels were checked against the installed LM Studio model capability data
and the Q4 GGUF chat template. The template accepts `low`, `medium`, `xhigh`;
thinking disabled is a separate switch. Desktop Off maps to
`reasoning_effort: "none"`, not `"off"` and not omission. Installed stock DSH/pi-ai
transport source was inspected for this mapping. Ollama Cloud now explicitly
uses the OpenAI reasoning-effort format rather than the old provider-wide Off
setting. A model accepting an effort name is not a benchmark proving its effect.

Claude effort support was checked against [Anthropic's effort documentation](https://platform.claude.com/docs/en/build-with-claude/effort).
Opus 5.5 defaults to Medium and does not offer thinking Off. Sonnet 5 defaults to
High. The installed Claude CLI was upgraded from 2.1.269 to 2.1.283 because a
live Opus 5.5 request explicitly required 2.1.280 or newer. Bounded live requests
then returned OK on Opus 5.5, Sonnet 5 and Haiku 4.5 with the expected actual
model identifiers. npm reported a locked old-version cleanup directory; other
Claude sessions were not killed to remove it. The new executable works.

Codex choices come from `C:\Users\scott\.codex\models_cache.json`, not invented
names. At verification the DSH CLI catalog exposes the four GPT rows above.
GPT-5.5 is its own model, not a nickname for Sol, Terra, Luna or Astra. Astra was
not in that CLI catalog. The native CLI routes use the signed-in CLI and its own
tools; they are not raw API-key routes or stock DSH tool execution.

## Removal and duplicate explanation

Gemini's Desktop provider was removed. `dsh-xai` was removed from the Desktop
profile's mounted bundles, so its Grok models are gone from the visible picker.
The installed plugin dependency and credentials were not deleted.

The two LM Studio Q4 rows were a raw GGUF route and a Halo tuned model definition
pointing to the **same GGUF**, not two downloads. The raw
`qwen3.8-27b-km` row is hidden; `halo/qwen3.8-27b-q4km` remains. The physical Q4
file remains at
`C:\Users\scott\.lmstudio\models\lmstudio-community\Qwen3.8-27B-Q4-KM-GGUF\Qwen3.8-27B-Q4_K_M.gguf`.
Ollama's separately installed local Q4 remains its own selectable runtime route.

Scott authorized deleting Q5. These exact files were deleted after confirming
the target and that the Q4/Q6 sources are elsewhere:

- `C:\Users\scott\.lmstudio\models\unsloth\Qwen3.8-27B-GGUF\Qwen3.8-27B-UD-Q5_K_XL.gguf`
- That Q5 directory's `mmproj-F16.gguf`.
- `C:\Users\scott\.lmstudio\hub\models\halo\qwen3.8-27b\model.yaml` (definition backed up first).

Freed 21,145,786,112 bytes (21.1 GB / 19.69 GiB). Restoring deleted weights would
require a new download; they were not copied into the backup. Q5 picker keys are
also excluded from future catalog generation.

## Verification and limits

- Native Desktop restarted and its actual UI showed the five approved clouds,
  explicit Opus 5.5, no Gemini/Grok/Q5, and the single Halo LM Studio Q4 row.
- The actual Q4 effort menu showed Default, Off, Low, Medium, Xhigh.
- Catalog refresh rerun; removed rows stayed removed and the default stayed Q4.
- Native CLI adapter/runtime tests: 33 passed, including exact Claude metadata
  and preservation of the legacy alias catalog when configuration is absent.
- LM Studio final state: one Q4 instance, context 131072, one lane, idle.
- This is catalog/transport verification, not a new quality or speed benchmark.
  Every cloud effort level was not independently exercised by generation.

The previous fresh Desktop smoke test remains relevant: stock `web_fetch`
returned HTTP 200; stock `web_search` failed `WEB_PROVIDER_CREDENTIAL_MISSING`
because its DeepSeek credential is absent. Wigolo remains callable on demand
through `desktop-optional-tools`; its tool schemas are not preloaded. No claim
is made that stock search is working. No computer-use installation was added.

## Files, recovery and reproduction

Live profile: `home\profiles\desktop\cordis.patch.yml`; bundle manifest:
`home\profiles\desktop\package.json`, under the Desktop root above.
Launch helpers are `Refresh-Desktop-Model-Catalog.ps1` and
`Select-Resident-Desktop-Model.ps1` in that root. The latter now selects Scott's
explicit startup default despite its historical filename.

Versioned helpers and the one-time migration are under `stack/desktop-tuning`.
`curate_picker.py` is for the recorded pre-change layout only; it intentionally
refuses to overwrite an existing backup. It is not a general installer and does
not delete weights. It installs the adjacent versioned helper files.
The final profile/package snapshot under that directory is machine-specific and
uses environment-key references; it contains no credential values.

Backups and original evidence:
`C:\Users\scott\Documents\Codex\2026-09-27\desktop-picker-audit`.
The `before` subtree contains profile, package, both helpers and Q5 definition.
Restore these only with Desktop stopped and after accounting for any subsequent
user changes. A full rollback also needs the previous native CLI adapter source;
changing that shared source could affect Web DSH and should not be done casually.
Human documentation and current deployable copies are mirrored under
`C:\Users\scott\Desktop\Halo Stack Research` with SHA-256 manifest entries.
