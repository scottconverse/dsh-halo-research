# DSH provider and account setup

Status recorded **September 18, 2026** for the supported stock DSH 0.1.6-alpha.1 deployment. This guide summarizes the repository's provider records; it does not change the running profile. Provider catalogs, subscription entitlements and account access can change, so the dated verification notes linked below are the evidence for each claim.

## The important distinction

A **model provider** appears as a model route in the chat model picker. An **agent provider** lets DSH delegate a separate task to another coding agent; it is not necessarily selectable as the current chat model. An **API key** and an **account sign-in** are also different: a provider accepting an API key does not prove that a consumer subscription pays for those API calls.

## What this repository supports

| Service | Current stock DSH status | How to use it | Authentication and limits |
|---|---|---|---|
| **Claude** | Claude Code delegation is an upstream optional package, but it is not installed in the supported stock web profile. Its model-facing row is disabled in the stock local preset. The repository also preserves a separate historical native-CLI integration under `stack/provider-integration`; that is not the current stock profile. | There is no active Claude route in the supported stock DSH picker. To delegate through Claude Code, the optional package would first need to be installed and deliberately enabled in the chosen profile. | The package uses Claude authentication and the Claude Agent SDK. A successful sign-in alone does not prove that SDK calls are covered by a Claude subscription. See [stock upgrade notes](DSH-ALPHA-UPGRADE-2026-09-15.md) and the [historical provider integration](../stack/provider-integration/README.md). |
| **Codex / OpenAI** | Available as optional **agent delegation**, not as a general Codex chat-model provider. The `Local + Codex` preset exposes the stock `subagent_codex` tool; ordinary `Local models` does not. | Start a session with **Local + Codex (opt-in)** and ask DSH to delegate a bounded task to Codex. | Uses native Codex sign-in and consumes Codex account usage. It does not use an OpenAI API key or make a Codex model a regular chat-picker entry. See [stock upgrade notes](DSH-ALPHA-UPGRADE-2026-09-15.md). |
| **Gemini** | Gemini 3.6 Flash is documented as a working API-key model route in the stock DSH picker. | Select **Gemini 3.6 Flash** as the chat model. | This is Google AI Studio/API-key access stored in DSH's credential store. It is not Antigravity, and it is not evidence that an Antigravity or Gemini consumer subscription covers API use. The dated check succeeded on a Free-tier project; another account or current entitlement may differ. See [stock upgrade notes](DSH-ALPHA-UPGRADE-2026-09-15.md). |
| **Antigravity** | No Antigravity provider or bridge is installed or verified in the supported stock DSH configuration. | There is no documented Antigravity route to select or delegate to here. Do not enter an Antigravity key into the Gemini API route and assume it provides Antigravity agent access. | A compatible integration and its authentication/terms would need to be identified and verified before claiming support. |
| **Grok / xAI** | The `dsh-xai` plugin provides the `xai-oauth` model route and xAI sign-in UI. Its version is pinned in the stock web-profile manifest, and an alpha compatibility patch is retained. | In DSH, open **Settings → xAI Grok**, sign in with the approved device-code flow, then select `xai-oauth` and an account-listed model such as `grok-4.6` in the model picker. | The documented successful route used SuperGrok OAuth, not `XAI_API_KEY`. OAuth/API entitlement is account-controlled and can change. Text inference was verified; image behavior and tool calling were not fully verified. See [SuperGrok setup and evidence](DSH-SUPERGROK-2026-09-15.md) and the [cloud repair record](HALO-DSH-IMPLEMENTATION-2026-09-15-CLOUD-REPAIR.md). |
| **Ollama Cloud** | DSH has an `Ollama Cloud` model route through the local Ollama OpenAI-compatible endpoint. The configured model is `deepseek-v4.1-flash:cloud`. | Keep the Ollama server running and signed in; select **DeepSeek V4.1 Flash (Ollama Cloud)** in DSH. | DSH talks to `http://127.0.0.1:11434/v1`; Ollama handles the signed-in cloud account. This cloud-backed model does not mean its weights are loaded locally. The route and tool workflow were verified in the dated note. See [Ollama Cloud setup](DSH-OLLAMA-CLOUD-2026-09-15.md). |

## Safe setup rules

- Use the existing supported DSH profile and its documented provider route; do not assume DSH reads Claude Desktop or other apps' `mcp.json` files.
- Keep API keys and OAuth credentials in the intended DSH credential store or provider's own sign-in flow. Do not put secrets in this repository, presets, screenshots, or recovery notes.
- Keep the distinction between picker models and delegated agents when describing or configuring a provider.
- Treat each linked test as evidence for the specific route, account and date tested. A provider appearing in a catalog, an installed package, or a successful login by itself does not prove inference access.
- Do not modify DSH settings as part of reading this guide. Apply any future provider change through the profile and release procedure appropriate to that provider.

## Detailed records

- [DSH 0.1.6-alpha.1 upgrade and optional capabilities](DSH-ALPHA-UPGRADE-2026-09-15.md)
- [SuperGrok OAuth installation, compatibility and recovery](DSH-SUPERGROK-2026-09-15.md)
- [Ollama Cloud route and verification](DSH-OLLAMA-CLOUD-2026-09-15.md)
- [Historical native Claude/Codex and OmniRoute integration](../stack/provider-integration/README.md)
