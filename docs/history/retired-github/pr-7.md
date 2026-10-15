# Historical PR #7: Mission Control: quick-action labels come from the loader scripts

Source URL: https://github.com/scottconverse/halo-stack/pull/7

Created: 2026-08-19T05:50:40Z · State: closed · Merged: 2026-08-19T05:50:52Z

## Original description

Closes the cosmetic remainder of #3: "Load Brain (Q5)" was a hardcoded string, so after a port adapts the loader (Q5 -> Q3 on the 5070Ti box) the label lies. Labels now derive from the actual GGUF path in the deployed loader scripts (60s cache), falling back to plain "Load Brain"/"Load Worker" if unparseable.

The substantive parts of #2 and #3 are already on master (commit 335ed3e): carveout from driver registry with graceful unknown state, origin badges via lms link status, no Load/Unload controls on remote fleet models, and a server-side 403 guard on the unload endpoint verified against the live remote model.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
