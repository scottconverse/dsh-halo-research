# DSH local, API-key and subscription model-provider research
Date: 2026-09-02
Status: research and source inspection only; no candidate installed or live-tested in this investigation.

## Decision and scope

There are credible free/open-source projects that can give DSH a much broader model/account selection surface. The strongest broad candidate is OmniRoute; ProxyPal plus CLIProxyAPI is the simpler desktop-oriented alternative. Neither replaces the local inference engine. Keep a local engine underneath either option.

Scott clarified that exact preservation of DSH's internal tool loop is NOT a requirement. Equivalent working functionality is sufficient. A bridge may translate protocols or delegate a coding unit to a provider's own agent. Judge whether it completes the desired work, exposes the desired model choices and makes execution understandable. Do not reject alternatives merely because DSH internals change.

This report does not claim every provider is authenticated, every Windows path works, or any candidate has passed Halo acceptance. Source-backed capability, project documentation and recommendation are distinguished below. No all-source audit or transitive dependency license audit was performed.

## Separate three functions

1. Local engine: reads GGUF weights, loads/unloads models, controls Vulkan/GPU/context/slots. llmster, llama.cpp and other inference servers occupy this layer.
2. Provider/account gateway: combines local endpoints, paid API keys and subscription/CLI routes into accessible services and model catalogs.
3. Harness/picker: DSH offers choices and runs coding work, potentially delegating to a provider-owned agent.

A cloud gateway may list models, but listing a local model does not prove it can discover its file, load it or apply Halo's tuning. A subscription grants the models and quota actually included in that account, not every model a gateway lists.

## Ranked candidate list

### 1. OmniRoute — broadest candidate to evaluate first

Repository: https://github.com/diegosouzapw/OmniRoute
License: MIT; repository LICENSE inspected.
Inspected revision: 6d556c24222b79606eb67d7ac3710f17a11036da, release/v3.8.51.

A Node/TypeScript gateway with a web management interface, provider accounts, model catalogs, OAuth/API integrations, routing, usage tracking and compatible local-server endpoints. It offers a broad management surface instead of requiring every account to be hand-managed in DSH.

Especially relevant: its Codex App Server provider delegates through a running Codex CLI/app-server rather than using only direct backend OAuth requests. Source includes dynamic-tool mapping. This is a real integration mechanism, not only a README promise; end-to-end behavior remains untested here.

It still needs llmster/another engine to run local weights. Desktop Windows support is documented; native Node operation avoids making WSL mandatory. It has many optional routing, caching and prompt-compression behaviors. These may be useful, but record which are enabled and how they affect the work; do not silently change the selected route or send a local task to a paid provider.

Primary implementation reference:
https://github.com/diegosouzapw/OmniRoute/blob/6d556c24222b79606eb67d7ac3710f17a11036da/docs/guides/CODEX-APP-SERVER-PROVIDER.md
Source: open-sse/executors/codex-app-server.ts.

### 2. ProxyPal + CLIProxyAPI — simpler Windows desktop option

Desktop repository: https://github.com/heyhuynhgiabuu/proxypal
Engine repository: https://github.com/router-for-me/CLIProxyAPI
Licenses: MIT in both repositories; license files inspected.

ProxyPal wraps CLIProxyAPI with a desktop account/connection interface and usage visibility. It advertises Windows x64 support, subscription connections and custom OpenAI-compatible endpoints. This makes it a practical candidate for an operator who wants to sign in, add endpoints and select models without a large management platform.

CLIProxyAPI is the Go translation/proxy engine underneath. It supports multiple provider protocols, streaming/tools, API-key routes and OAuth-backed providers including Codex, Claude and Gemini. DSH can target its compatible endpoint while the proxy connects to the chosen upstream.

Neither component replaces GGUF loading or automatically proves all local files are discoverable. Connect a local inference server and synchronize the resulting catalog into DSH.

Important implementation detail: CLIProxyAPI's sample configuration contains Claude/Codex cloaking options. Its Claude setting describes system-prompt replacement for non-Claude clients. That is a material behavior to understand, not a reason to reject all translation. Provider account rules remain independent of the project's MIT license.

Inspected CLIProxyAPI revision: 17a65ee5470fbaf0e22fc219381e6a4ae9e07624.
https://github.com/router-for-me/CLIProxyAPI/blob/17a65ee5470fbaf0e22fc219381e6a4ae9e07624/config.example.yaml

### 3. 9Router — another broad unified gateway

Repository: https://github.com/decolua/9router
License: MIT; LICENSE inspected.
Inspected revision: 90b52e06ffd666b7929554211474d01588f6b1f8.

A web-managed provider gateway with subscription/OAuth routes, API-key providers, model/account management and compatible local endpoints. It translates requests and can route/fall back across configured providers.

This is a credible alternative, but overlaps substantially with OmniRoute's project lineage and feature set. They should not be counted as wholly independent evidence that a feature works. Compare one against the other rather than install both. Marketing about unlimited/free inference does not remove upstream subscription limits.

### 4. LiteLLM — strong API gateway with actual ChatGPT subscription support

Repository: https://github.com/BerriAI/litellm
License: MIT core; enterprise/ has separate licensing. Do not treat every repository feature as MIT.

A Python gateway/SDK providing provider normalization, routing and management across cloud APIs and compatible local services. Crucially, its documented ChatGPT provider now supports device OAuth and subscription access; describing LiteLLM as API-key-only would be wrong.

That does not establish equivalent Claude/Gemini subscription coverage. It is a strong API-management choice, but not the best verified fit for all three subscription families in one consumer-facing setup. Its ChatGPT adapter documents parameter differences, showing that protocol compatibility is not necessarily identical behavior.

Source: https://docs.litellm.ai/docs/providers/chatgpt
License: https://github.com/BerriAI/litellm/blob/litellm_internal_staging/LICENSE

### 5. Bifrost — Apache-2.0 gateway, stronger fit for API management

Repository: https://github.com/maximhq/bifrost
License: Apache-2.0; LICENSE inspected.
Inspected revision: 6fd054d3245b45799fe717c55135f3e105683631.

Go-based gateway with a management interface, multiple model providers, routing and operational controls. Suitable for cloud API keys and compatible local-server access.

Its Claude Code integration documentation includes subscription-related/pass-through scenarios, so claiming it has no subscription capability would be too strong. However, I did not establish a single general-purpose DSH integration covering all three subscription families. Gateway OAuth or dashboard login must not be mistaken for model-subscription authentication.

Useful alternative if ordinary API management dominates the requirement.
https://getbifrost.ai/guides/claude-code/claude-code-gateway

### 6. llama-swap + llama.cpp — fully open-source local-runtime alternative

Repositories:
https://github.com/mostlygeek/llama-swap
https://github.com/ggml-org/llama.cpp
Licenses: MIT.

llama-swap is a local process manager/proxy: it launches configured model servers on demand, routes requests by model, and manages swapping/lifetime. It has a web interface and Windows distribution support. llama.cpp does the inference.

This is the strongest straightforward candidate if replacing the proprietary local runtime is itself a requirement. It is not a unified subscription manager and does not automatically discover every GGUF just because the files exist. It needs model definitions/commands, and Halo's tuned settings must be translated and checked.

Combine it with a provider gateway if an entirely open-source local/provider infrastructure is desired. That is a bigger change than retaining llmster.

### 7. Adaptive LLM Gateway — relevant concept, not my first deployment recommendation

Repository: https://github.com/renefichtmueller/adaptive-llm-gateway
License: Apache-2.0; LICENSE inspected.

The project advertises discovery of installed subscription tools and automatic local HTTP bridges, alongside routing and other gateway features. This is close to Scott's stated requirement.

But the examined source is materially less convincing than the headline. packages/gateway/src/modules/bridge-spawner.ts invokes Claude with --print, while its Codex branch invokes codex without the explicit exec subcommand. The generic bridge accepts prompt/system/model and returns captured stdout, rather than establishing a full tool-capable conversation contract by itself. A separate openai-bridge/server.js invokes an openai CLI with old model defaults; that is not proof of current ChatGPT subscription support.

This does not prove the entire project cannot work. It does mean I would not call its advertised provider set ready for this Windows DSH deployment without additional validation. It describes itself as experimental.

### 8. DevHarmonics — our existing reference, not hypothetical infrastructure

Repository: https://github.com/scottconverse/DevHarmonics
License: Apache-2.0; local LICENSE inspected.

The current local implementation has a supervised subprocess lane for codex, claude and agy, alongside other integration lanes. scripts/providers.mjs builds codex exec and claude -p invocations; it explicitly accounts for Windows prompt delivery and provider output formats.

This is a viable pattern for subscription-backed coding delegation. It need not become a perfectly transparent raw-model endpoint to be useful. DSH can delegate work to the authenticated agent and consume its results.

The inspected agy branch does not implement a verified arbitrary model-selection flag. Do not equate that branch with proven universal Gemini model selection.

Local reference:
C:\Users\scott\Desktop\Code\DevHarmonics\scripts\providers.mjs

## What DSH already contains

The installed package C:\Users\scott\.dsh\profiles\node_modules\@deepseek-ai\dsh-llm-pi-ai\package.json is version 0.1.1-rc.2, MIT. Its bundled code contains authorization integration. The matching local upstream source documents multiple provider routes, custom compatible endpoints, credential references and provider-native OAuth flows.

Therefore a new gateway is not a prerequisite merely to add API providers to DSH.

A significant picker detail: a configured models list replaces that route's catalog; modelOverrides modifies entries without deleting the rest. The adapter does not itself continuously query upstream catalogs. Provider breadth and a refreshed picker are separate concerns.

This is installed/source evidence, not a claim that every login currently works through the live cockpit.

Local source:
C:\Users\scott\Desktop\Code\dsh-halo-research\_upstream\deepseek-harness\packages\llm\llm-pi-ai\README.md
Public source:
https://github.com/deepseek-ai/deepseek-harness/tree/main/packages/llm/llm-pi-ai

## Subscription access: three different mechanisms

- OpenAI: official Codex App Server documents managed ChatGPT login and experimental dynamic tools. This provides a documented integration route beyond scraping or pretending a subscription is an API key.
  https://learn.chatgpt.com/docs/app-server
- Claude: current Claude Code terms distinguish using an unmodified Claude Code installation with the end user's login from third-party collection/storage/intermediation of Claude.ai subscription credentials. A proxy's ability to do OAuth does not by itself establish provider approval. Delegating to the official CLI is worth considering on its own merits.
  https://code.claude.com/docs/en/legal-and-compliance
- Gemini: official Gemini CLI supports Google login and recognizes Google AI Pro/Ultra accounts. That supports a CLI-based route; it does not prove that every third-party backend-token proxy is supported.
  https://geminicli.com/docs/get-started/authentication/

These are compatibility/account-reliability distinctions, not a proposal to remove capabilities from Scott's machine.

## Licensing boundary

MIT and Apache-2.0 are permissive licenses suitable for the requested Apache-compatible direction, retaining their notices and complying with applicable dependencies. This is a top-level license screen, not a full redistribution audit.

The software may be free; upstream inference and subscriptions are not necessarily free.

Do not label LM Studio/llmster itself Apache-licensed just because surrounding tools or inference dependencies are open-source. LM Studio publishes proprietary application terms; this investigation did not establish an open-source license for the llmster daemon. Using it as a separate local service is different from distributing it as part of an Apache-licensed product.
https://lmstudio.ai/app-terms

EasyCLIProxyAPI was also examined. Its repository metadata did not identify a license and LICENSE retrieval returned 404. It is excluded from the verified-license shortlist, not declared permanently unusable.
https://github.com/router-for-me/EasyCLIProxyAPI

## Recommendation and next decision

1. Evaluate OmniRoute first for the broad local/API/subscription management experience. ProxyPal plus CLIProxyAPI is the simpler alternative.
2. Keep the local runtime migration separate: llmster still makes sense for retaining LM Studio's model/runtime ecosystem without its GUI. It is not an alternative to a cloud-account gateway; they solve different functions.
3. Use DSH's existing provider support wherever it already meets the need. Do not build a universal provider layer from scratch.
4. Accept provider-owned coding/delegation loops where they deliver equivalent useful results. Do not reject them for failing to preserve DSH internals.
5. Verify a small end-to-end slice before choosing: local catalog including unloaded models; explicit cloud-model choice; one API-key route; relevant subscription routes; a real file/edit/test task; cancellation and session continuation. Record which runtime actually did the work.
6. Preserve the tuned local settings and full requested capabilities. Any route-specific limitations should be stated, not silently imposed.
7. If the entire local engine must also be open-source, compare llama-swap plus llama.cpp against llmster separately.

No benchmark, installation, login, account mutation, model generation, service restart, or runtime configuration change was performed for this report. Research documents are the only intended writes. Existing unrelated/uncommitted Halo work was not absorbed into a commit.

