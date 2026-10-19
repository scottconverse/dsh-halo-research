# DSH DeepSeek 1017 cloud default — October 19, 2026

## Result
Web and Desktop saved defaults now select Ollama deepseek-v4.1-flash:1017-cloud with reasoningEffort off. Each Ollama Cloud provider list contains only that model. Local Ollama and every non-Ollama provider, model, tool, context/output limit and preset remain semantically unchanged. Old cloud pointer tags remain in Ollama itself; only DSH picker rows were removed. Existing conversations can retain their prior selection.

Four profiles were migrated from backed-up originals: live Web/Desktop and their canonical stack copies. A full parsed semantic comparison passed after applying only the requested default/model-list differences. Existing !!js tag warnings were retained, not introduced. Desktop refresh helpers retain local discovery and now identify only the approved cloud ID; both live and canonical helper copies updated.

## Verification and limits
- Direct API prompt: Reply exactly OK. Sent model deepseek-v4.1-flash:1017-cloud, think:false, stream:false, num_predict:4. Returned model deepseek-v4.1-flash:1017, content OK, no thinking, 8 input/2 output tokens.
- DSH Web new-session picker visibly selects DeepSeek V4.1 Flash 1017 (Ollama Cloud), Off. Prompt: Reply exactly OK. Do not use tools. Completed in 1 second, one step, OK; UI reported 25.1K token usage. No benchmark or research job.
- Desktop saved config was parsed and verified. Running Desktop process did not expose a targetable window; an attempt to show the existing app also returned no targetable window. Live Desktop picker/response is NOT VERIFIED. No Desktop restart or local-model residency change was performed. Its localhost host remains authenticated.
- Worker profile already selected the new ID and effort none at initial inspection. Catalog default_reasoning_level high was corrected to none. Worker routing override saved in the installed skill/reference and recovery record. Launcher default executable corrected from missing npm-vendored binary to the installed Scoop CLI shim. Only new DeepSeek workers were invoked.

## Failures and resource accounting
The first delegated worker expanded its inspection and failed to deliver. It was stopped; its partial Web edit joined two YAML lines incorrectly. Coordinator restored the affected logic from verified originals and applied a narrow migration with semantic preservation checks. The second worker exhausted its six-call bound, reported matching failures and delivered no accepted change. Its success receipt indicates a completed CLI turn, not successful implementation. Both results were rejected. No additional worker was launched.

First worker last observed usage: 568746 input (302042 cached), 15180 output, 583926 cumulative total. Second worker final receipt: 331706 input (306304 cached), 18818 output, 350524 cumulative total. Combined observed: 900452 input including 608346 cached; 33998 output; 934450 total. First worker final accounting is unavailable after interruption, so the combined count is a lower bound, not an exact total. Both exceeded the earlier 250K cumulative-token boundary; that was a coordinator failure. No automatic compaction was confirmed. Coordinator usage is not exposed here. The direct API and Web UI figures above are separate from worker usage. No usage total is presented as billing or account quota.

Private prompts, receipts, backups and preservation checks are in C:\Users\scott\Documents\Codex\2026-10-19\dsh-deepseek-1017. No private raw conversation dumps or authentication tokens are published. No other agent's activity is counted.
