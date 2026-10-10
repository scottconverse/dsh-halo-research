# DSH Web launcher error repair

## October 9, 2026: Web shortcut startup error repaired

The restored Start DSH Web shortcut reached the launcher but failed because LM Studio had no resident model. The selected route was web-fast/halo/qwen3.6-35b-a3b-q6. Loaded only that model at context 65536, parallel 1, and verified the exact Launch-StockDSH.ps1 path opened Chrome with DSH and Mission Control. Mission Control returned HTTP 200; DSH listened on 3080; loaded-model inventory contained only the selected 35B Q6 model.

Fixed Start-StockDSH.ps1 to retain validation stderr and launcher-model-route.mjs to print concise errors instead of stack traces. All 13 focused route tests pass. The empty-model failure path was exercised without unloading the working model. Startup still validates the selected route; it does not automatically load/unload models or switch to another resident model. Git history confirms the old fixed-pair autoload behavior was removed in eb4e5578. No upstream version or model defaults changed. This check verifies startup, not a full reporting pipeline.
