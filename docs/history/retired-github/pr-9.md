# Historical PR #9: Eviction JIT-reload alarm + 16GB-class deploy advisory (issue #5)

Source URL: https://github.com/scottconverse/halo-stack/pull/9

Created: 2026-08-19T05:56:36Z · State: closed · Merged: 2026-08-19T05:56:46Z

## Original description

Implements both halves of #5:

- **USER-MANUAL advisory** under Porting: worker context cap (<19K on 16GB, with the crash record), the eviction JIT-reload trap (17.5 vs 49 tok/s measured), and the LM Studio context auto-sizing note including the warning that HALO loader asserts contextLength===65536 exactly and may start failing for auto-sizing reasons after an engine update.
- **Mission Control alarm**: status() compares the live local brain (identity, quant, context from lms ps) against the deployed loader script itself (identity/quant/ctx parsed from the .mjs, 60s cache). Divergence trips MODELS amber: "eviction JIT-reload suspected; re-run the brain loader". Because everything is parsed from the deployed loader, a ported box with a Q3 loader gets the correct expectation with zero config.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
