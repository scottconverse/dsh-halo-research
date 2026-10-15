> Historical source recovered October 15, 2026. Claims and instructions describe the original period; this is not a current deployment guide or a new verification. See the [history index](../README.md).

# DSH development: provider access

SCOPE: DSH Halo DEVELOPMENT only. Prepared 2026-09-02 against installed OmniRoute 3.8.50 and DSH 0.1.1-rc.2. This is not a production migration or a claim that every listed provider works.

## Start here

Development DSH is at **http://127.0.0.1:3180**. Its provider dashboard is **http://127.0.0.1:20129/dashboard/providers**. Production remains at port 3080; do not change that installation while following this guide.

Repository: `C:\Users\scott\Desktop\Code\dsh-halo-dev`.

There are two different ways cloud models can participate:

1. **A model route through OmniRoute.** DSH owns the tool loop and sends model requests to the gateway. API-key routes and several subscription/OAuth routes fit here.
2. **An official coding-agent delegate.** DSH delegates a unit to Claude Code or Codex; that official agent owns its execution. This can give equivalent coding capability without pretending it is an ordinary model completion endpoint.

A subscription to a consumer product and an API billing account are different credentials/entitlements. A provider appearing in the picker establishes catalog discovery, not a usable account. Available models, account access, tool behavior, context limits, and actual coding success must be reported separately.

## Which route to choose

| Product/access | Installed route or integration | What to supply | Current evidence boundary |
|---|---|---|---|
| Local LM Studio | `lm-studio`, public prefix `lmstudio`; direct DSH LM Studio route is also retained | Local endpoint, normally no provider key | Local coding through the development gateway passed; actual loaded context is 32768. Shared hardware is not isolated hardware. |
| Claude API | `anthropic`, prefix `anthropic` | Anthropic API key, entered locally into the development dashboard | Catalog/source support; no authenticated cloud coding acceptance in this experiment. |
| Claude subscription through official CLI | Development native runner `dev/cli-runtime.mjs`; DSH adapter integration is separate | Reuse Scott's existing official Claude Code login in the normal Windows-user configuration | Earlier isolated-home attempts returned **Not logged in**. Scott subsequently authorized the TownReporter-style existing-login approach. Runner mock tests pass; current live acceptance must be checked in the development evidence. |
| Claude subscription via gateway OAuth | OmniRoute `claude`, prefix `cc`, dashboard label **Claude Code** | Its interactive OAuth connection flow | This is a gateway OAuth route, not proof it delegates to the official CLI. Upstream explicitly marks it `subscriptionRisk:true`. Not authenticated/tested here. |
| OpenAI API | `openai`, prefix `openai` | OpenAI API key | Separate from ChatGPT subscription; not authenticated/tested here. |
| Codex subscription through official CLI | Development native runner `dev/cli-runtime.mjs`; or OmniRoute `codex-app-server`, prefix `cxa` | Reuse Scott's existing official Codex login; app-server route separately needs an explicitly configured local CLI app-server | Earlier empty-home status returned **Not logged in**. That is not a test of the newly authorized normal-user-home runner. App-server transport remains a separate, unaccepted route. |
| Codex subscription via gateway OAuth | `codex`, prefix `cx` | Dashboard OAuth flow | Upstream marks this token-based gateway route `subscriptionRisk:true`; distinct from its app-server transport. Not authenticated/tested here. |
| Gemini API | `gemini`, prefix `gemini`, label **Gemini (Google AI Studio)** | Google AI Studio API key | Source/catalog support; current account quota and model access are unverified. |
| Gemini subscription / official CLI | No equivalent tested DSH development delegate established in this work | A separately reviewed official CLI integration or a supported provider-specific connection | Do not infer support from a Google consumer subscription. OmniRoute also lists Antigravity and Gemini web-session routes, but these are different products/auth paths, not interchangeable entitlement. |
| DeepSeek API | `deepseek`, prefix `ds` | DeepSeek platform API key | Source/catalog support only; no key or inference validation performed. |
| Kimi API | `moonshot`, prefix `moonshot`, current dashboard name **Kimi** | Kimi API platform key | Preferred current API card. Legacy `kimi` is hidden from the dashboard. Not authenticated/tested here. |
| Kimi Code plan | `kimi-coding` OAuth; `kimi-coding-apikey`, prefix `kmca`, for the key variant | The appropriate Kimi Code login/key | Separate from general Kimi API billing. The key variant may be folded into the Kimi Code card. Not authenticated/tested here. |
| GLM Coding plan | `glm`; `glm-cn`/`glmcn` for the China variant | Key valid for that plan and regional endpoint | Source/catalog support only. |
| GLM general API | `zai`, prefix `zai` | Key for the configured Z.AI/BigModel API account/region | Separate from a coding-plan credential. Not authenticated/tested here. |

The installed `gc` alias means **Grok Build**, not Gemini. Do not use that abbreviation to count or identify Gemini routes. `glmt` is a GLM thinking preset, not an additional subscription entitlement.

### Product/account links

- OmniRoute source: https://github.com/diegosouzapw/OmniRoute
- Installed release package: https://www.npmjs.com/package/omniroute/v/3.8.50
- Claude API console: https://platform.claude.com
- Claude Code: https://code.claude.com/docs/en/overview
- OpenAI API platform: https://platform.openai.com
- Codex CLI: https://developers.openai.com/codex/cli
- Gemini API key console: https://aistudio.google.com
- Gemini CLI source: https://github.com/google-gemini/gemini-cli
- DeepSeek platform: https://platform.deepseek.com
- Kimi API platform: https://platform.kimi.ai
- Kimi Code: https://www.kimi.com/code
- GLM Coding: https://z.ai/subscribe
- BigModel platform: https://open.bigmodel.cn

These identify the products; this guide does not quote current prices, free allowances, or guaranteed account eligibility.

## Connect an API-key provider

1. Open **http://127.0.0.1:20129/dashboard/providers**, not another gateway instance.
2. Sign in with the development dashboard password. It is held only in the ignored local file `C:\Users\scott\Desktop\Code\dsh-halo-dev\.runtime\credentials\provider-admin.json`. A developer can fill the local login from this file; do not print its contents, paste it into this conversation, or put it in Git. It is not a personal provider credential.
3. Select the provider card from the table. Enter the provider key directly into the local UI. Confirm the correct general-API versus coding-plan account and region before saving.
4. Treat a save or catalog refresh as **configuration**, not successful model use. Connection validation commonly starts with a model-list GET; some validation paths can fall back to a small inference request, which can consume quota or load a local model. Do not present the Test button as universally side-effect-free.
5. Refresh the provider's model catalog. The development adapter then needs to run `dev\sync-catalog.mjs`; the running DSH provider may require a **development-only** restart to pick up edited configuration. Do not restart production or LM Studio for that.
6. Select the exact model in development DSH and run one bounded real task. Preserve request identity, tool execution, output, independent checks, timing, and any failure. A listed model with no account remains **connect account**, not a broken local model.

Provider registration in this installed version automatically schedules model discovery. It does not itself run inference validation. For built-in LM Studio, discovery issues model-list GET requests; explicit validation is a separate operation. An `x-skip-model-sync` request header is not implemented in this installed registration route.

## Connect subscription access without exporting credentials

### Official Claude Code / Codex delegates

Scott authorized the same approach already used by TownReporter: launch the **official native CLI using the existing Windows user's login**. Do not create an empty CLI home and then mistake its missing account for a subscription limitation. These child-process overrides do not change global Windows environment variables:

| Process | Native child environment |
|---|---|
| Claude Code | `CLAUDE_CONFIG_DIR=C:\Users\scott\.claude` |
| Codex | `CODEX_HOME=C:\Users\scott\.codex` |
| Both | `HOME` and `USERPROFILE` equal `C:\Users\scott`; coding working directory is the explicit development fixture |

No login is initiated automatically. The native CLI itself reads its normal existing account. The runner does not extract or copy tokens/passwords, and removes inherited `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` variables to avoid accidentally switching to API billing. If the official status probe says authentication is missing, Scott may complete the official interactive login. A configured API account or account-level setting can still select API access; check the reported authentication method rather than assume subscription billing.

**Isolation exception, explicitly authorized:** normal `.claude` and `.codex` account/configuration state is reused. The CLI can read normal user settings, skills, hooks and MCP configuration; it may update its own cache/logs or refresh account tokens as it normally does. This is not fully isolated account state and must not be described that way. Ephemeral/no-session-persistence options avoid ordinary saved conversation sessions, not every possible user-home write. Task files, development DSH state and evidence remain in the development repository. The previous isolated-home failure remains historical evidence in `dev\ISOLATION-REVIEW.md`.

For OmniRoute's **Codex App-Server** card, use a separately owned app-server process if that route is chosen. Do not attach to the Codex desktop's internal process or an unrelated project's server. The new direct native runner does not require this app-server route. See `dev/CLI-RUNTIME.md` for its interface and evidence limits.

### Gateway OAuth

The **Claude Code** (`claude`) and **OpenAI Codex** (`codex`) gateway cards offer their own OAuth flows. You may choose them; they have not been removed from the design. Complete their browser flow yourself and review the provider's current access terms and the upstream warning. OmniRoute itself marks these routes as subscription-risk integrations. An OAuth success does not guarantee the service permits every proxy usage or offers every advertised model. This is an account/provider limitation to disclose, not a reason to silently remove the option.

Ordinary browser-session/cookie adapters also exist upstream. They are not configured by this guide. Their presence is not equivalent to an official OAuth grant or CLI integration; no personal browser profile is imported here.

## Reading the model chooser honestly

- **Connect account:** discovery only. It does not mean an API key was found or a subscription can be consumed.
- **Configured:** an active connection is present. It is not an inference or coding PASS.
- **Context unverified:** the number is a provisional local declaration or catalog-reported cloud limit, not a measured provider limit.
- **Engine-observed context:** for already-loaded local instances, use the LM Studio loaded-instance configuration. Current local observations are 32768; ignore the gateway's generic 128000 fallback for those instances.

The legacy `GET /api/models?all=true` list drops type/context metadata. Rich `GET /v1/models` and `GET /api/models/catalog` supply more metadata but may not cover every unconnected provider. The development merge excludes only explicitly typed non-chat rows (`image`, `audio`, `video`, `music`, `embedding`, `rerank`, `moderation`). Unknown entries remain visible; their retention does **not** certify chat capability. Multimodal chat stays available. This is model-level filtering, not a provider blacklist.

Exclusion and provenance receipt: `.runtime\evidence\catalog-enriched.json`. Cloud metadata lookup: management-authenticated `GET /api/models/alias?alias=<qualifiedId>` returns declared limits and source flags. Static specs, registry data, and synced capability catalogs are not proof of the provider's currently enforced limit.

## Known development limitations

- Slow-start Chat Completions streams can begin with synthetic ID `chatcmpl-keepalive` and model `keepalive`. DSH may retain those in replay metadata. `OMNIROUTE_SSE_COMMENTS=on` does not replace the early synthetic frames. Use corroborating request/upstream records for attribution; an upstream compatibility fix is still needed.
- The installed cloud-sync setting reads `cloudEnabled:true`, but no cloud destination is configured; inspected code returns before synchronization. The attempted settings PATCH did not disable that flag. Do not claim otherwise or configure a destination silently.
- Eight dependency advisory entries remain after the direct YAML patch, including propagated findings. Their exploitability in enabled routes is not established. No blind dependency downgrade or transitive fix has been applied.
- Editing the gateway catalog does not guarantee an already-running DSH process reloads it. The recorded development experiment required a controlled DSH-only restart.
- Development and production share the machine and LM Studio runtime. Do not warm, unload, or reconfigure models as part of account setup.

## Licensing and maintenance boundary

OmniRoute 3.8.50 ships an MIT license; retain its copyright and license notices. Its permissive code license is compatible with inclusion in an Apache-2.0 project in the ordinary licensing sense, but does not relicense third-party dependencies, model weights, proprietary CLIs, or service subscriptions. The official vendor CLIs/services remain governed by their own terms. This source inspection is not a legal review of all dependencies or subscription use.

Provider source definitions used for this guide are under `dev\tools\node_modules\omniroute\src\shared\constants\providers\`: `oauth.ts`, `noauth.ts`, `local.ts`, `apikey\frontier-labs.ts`, and `apikey\regional.ts`. CLI integration isolation and actual failed authentication receipts are documented in `dev\ISOLATION-REVIEW.md`; overall live acceptance is in `dev\DEVELOPMENT-STATUS-2026-09-02.md`. Treat those as dated evidence, not perpetual service health.
