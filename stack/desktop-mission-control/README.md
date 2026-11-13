# Desktop Mission Control

Full Halo Web Mission Control embedded in the native Desktop sidebar. Uses the same seven tabs, CSS, charts, model catalog/actions, session controls, plugin inventory, memory graph, and transactional settings editor. Desktop host authentication stays in memory and uses the installed host's supported webServer/connection services; it never reads the Web launch log or uses Web port 3080.

The plugin owns loopback port 3091 and stops with its Desktop host. Web Mission Control remains independent on 3090. The native panel accepts navigation messages only from its iframe and exact loopback origin. Existing CSRF and action authorization remain intact. Settings target the Desktop live and repository profiles. Automatic shared-model recovery remains with Web; opening this panel never loads a model automatically. Explicit model controls remain available.

The additive entry in ../desktop-tuning/cordis.patch.yml loads index.mjs. No executable rebuild, package install, shortcut change, or model/provider default change is required. The panel appears on the next normal Desktop launch. Do not launch Desktop merely to test installation when models must remain unloaded: existing independent MCP startup can have its own model behavior.

Verification: `node --test stack/desktop-mission-control/test.mjs`. sync-dashboard.py regenerates dashboard.mjs from the canonical Web source with asserted Desktop adaptations; web-provenance.json records exact input/output hashes. Re-run affected tests and headless host acceptance after regeneration. The headless test used actual installed rc.1 host with an isolated metadata-only provider and no model endpoint. It did not exercise model mutations or inference.

Rollback while Desktop is fully closed: remove only the desktop-mission-control insert block from live and repository Desktop profiles, or restore the recorded pre-change profile copies if no subsequent edits were made. Preserve later unrelated edits. No signed binary was changed.
