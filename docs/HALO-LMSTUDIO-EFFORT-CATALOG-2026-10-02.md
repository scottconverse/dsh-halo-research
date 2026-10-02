# LM Studio effort catalog correction — prepared 2026-10-02

Status: generator fixed and both candidate profiles generated against the live LM Studio catalog. Activation is deliberately deferred while Orca's blind coding test is running.

Root cause: the Desktop generator discovers models with `lms ls`, but that inventory does not include `capabilities.reasoning`. Only hard-coded Qwen exceptions got controls. The generator now also reads the non-generating `/api/v1/models` endpoint and carries declared reasoning options into other model rows. Existing tested Halo mappings and model defaults remain unchanged.

Native LM Studio off/on names are not valid Chat Completions request values. Binary models get DSH Off -> none, On -> medium (a transport alias, not an assertion that the model supports a graduated Medium budget). This normalization is also used by the upstream Hermes LMS client. Models with no reasoning metadata get no controls. Real graduated model options retain their names; redundant native On aliases are not presented as extra effort budgets. The existing verified Qwen27 controls and brain controls are preserved.

Candidate profiles: `C:\Users\scott\Documents\Codex\2026-10-02\lmstudio-effort-catalog\desktop-staged.yml` and `profiles\web\cordis.patch.yml` in the same directory. Live capability snapshot: `lmstudio-capabilities.json` there. Both generator and Web catalog-sync commands completed on copies, without generation, model loading or changes to active profiles.

Orca and the untuned Unsloth 35B entry now have Off/On in the candidates. The non-thinking 30B coders still have no effort control. Five curated cloud rows, local budgets, current saved selections, and Web main/fallback routes are retained.

Activation finish line: after the coding test and all other host turns are idle, back up and regenerate from the THEN-CURRENT live profiles (do not overwrite later changes with these candidates), deploy the generator to the existing Desktop launcher directory, apply the catalog-only changes, and restart only idle hosts if registration needs it. Preserve the then-current model selection by launching Desktop with its existing DSH_HOME directly rather than the Q4-forcing selector. Do not load/unload models or edit the challenge. Verify authenticated catalogs expose Orca Off/On in both hosts, check a bounded Orca Off/On wire probe only after idle, sync canonical snapshots and human recovery copies, commit/push and pause the activation heartbeat. Record any runtime limitation accurately; do not claim the toggle worked solely from menu labels.
