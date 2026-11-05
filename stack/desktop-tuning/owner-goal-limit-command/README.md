# Historical owner-command reference only

This is the already delivered one-off256→512 goal-cap helper source. The original
private goal identity is replaced by an inert placeholder. It is not installed by
either portable installer, not an instruction to edit another goal, and grants no
new budget, role privilege or resume authorization. Preserve original goal/history.

# Existing Verdict goal limit repair

Prepared for Scott's explicit authorization to raise his existing Coordinator goal from 256 to 512 and resume it. This is an additive human slash command using DSH's native `commands` and `goals` services, modeled on the installed `@deepseek-ai/dsh-command-goal`. It registers no agent tool and changes no triad guard, model, authentication, or existing plugin.

After installation through DSH's normal plugin manager, invoke `/verdict-goal-limit 512` in the existing Coordinator session. Loading the bundle alone does nothing to the goal. Only goal `goal-OWNER-SPECIFIC-NOT-EXPORTED` blocked specifically by `round-limit` is eligible. Native compare-and-set edit and resume preserve its identity, objective, used count and persisted history. Human pauses, other blockers and replacement goals are refused. Repeated invocation after success is a no-op.

No dependencies, install scripts, network calls, shell execution, credential access, direct ledger/session writes or model calls. Tests exercise command policy and API sequencing with a mock domain; they are not live deployment evidence. Native readback and subsequent team activity are required before claiming recovery.

If normal installation reports restart required, do not restart active work. Do not bypass any plugin trust or authentication safeguard.
