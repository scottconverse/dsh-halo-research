# Strata presets for DSH Web and Desktop

This opt-in Windows overlay targets the DSH 0.2.2-rc.1 Halo profiles. It uses the existing DSH provider adapter and native delegation tool. Web and Desktop share the same startup controllers. Both machines serve Qwen3.8 Flash-Next IQ3_S, model ID `qwen3.8-flash-next-iq3_s`, with one request slot each.

| Session preset | Halo lead | 5070 Ti worker |
| --- | --- | --- |
| **Halo + 5070 Ti** | Full-memory Strata, original 131,072-token route, loopback 8081 | Same 32,768-token route on both presets, 8,192 maximum output, tunnel on Halo loopback 8082 |
| **Halo + 5070 Ti (32K capped)** | Separate 32,768-token Strata lead, 8,192 maximum output, loopback 8083 | Same worker |

In a new session, choose **Halo + 5070 Ti** for full-memory operation or explicitly select the capped option. The first lead request starts Halo Strata if its endpoint is unavailable. The lead can call `delegate_to_5070ti` for independent work. The first worker request starts remote Strata by SSH and waits for readiness. The worker's model runs on the 5070 Ti, while its DSH tools and session run on Halo. The child uses `local-lean`, delegation depth is one, and delivery goes to the parent. Opening the app or choosing a preset does not launch a model. DSH's global model selection and the ordinary **Local Qwen** route remain intact.

## Prepare the overlay

- Use an existing compatible Halo Web and Desktop profile with `strata-local`, `halo-preset-local`, `local-lean`, and the native subagent plug-ins. Node.js 24 is the tested host. Run `npm ci --ignore-scripts` in this directory to install the profile renderer's YAML dependency.
- Copy `settings.example.json` to `settings.json` in this directory and fill in local absolute paths. A host may instead inherit `DSH_STRATA_CONFIG` pointing to a machine-local settings file. Keep the overlay and its state logs in a private writable directory on Halo. Both apps need read access to the overlay and the local model assets.
- Supply the existing, known-good Strata 0.1.59 installation and full-memory `local-qwen.json`. The controller reads that file and writes its own launch JSON. The Halo launcher Python needs `psutil`, and the prefetch Python needs `psutil` and a compatible `gguf` reader. It can be the same interpreter.
- Use the tested capped launch JSON if it is already staged. Otherwise use [the capped launch template](halo-capped.example.json) with the corresponding HIP engine, tokenizer, model pack, native GGUF, PLE GGUF, and ranked expert profile. Keep the source port at 18181 and the context at 32,768. Record the final file's hash as `halo.cappedConfigSHA256` using `Get-FileHash -Algorithm SHA256`. The controller uses a private copy on port 8083.
- Set up key-only SSH with the 5070 Ti host key already trusted by the same Windows user running DSH. Use absolute paths in `worker.remoteRoot` and `worker.remotePython`. On the worker, stage the compatible CUDA Strata Control distribution under `strata-control`, with its packaged interpreter at `strata-control/python/python.exe`. The supervisor Python needs `psutil` installed or present under `vendor`. `nvidia-smi` must resolve in the SSH session.
- The remote root must contain the approved `blackwell-5070-strata-off-config.json` and its verified assets. Use [the worker launch template](worker-launch.example.json) when recreating the configuration. Hash the fully provisioned worker launch file on the worker, then put that SHA-256 in `worker.launchSHA256`. Retain the benchmark verification files `assets-verified.json` (16 entries in `assets`) and `model-copies-verified.json` (two model shards, each with `file`, `bytes`, and `mtime_ns` under `models`). The preflight checks the asset receipt count, both shard sizes and timestamps, the launch hash, and the existence of the required launch files. Model weights, Strata binaries, actual deployment paths, and private profile snapshots are supplied by the operator.

Before deploying, set `$web` and `$desktop` to the absolute paths of the two baseline `cordis.patch.yml` files and `$records` to a new private backup directory. Run these commands from the overlay directory.

```powershell
node .\profile.cjs stage $web $desktop $records
node .\verify.mjs $dshRuntimePackageJson $records
```

Set `$dshRuntimePackageJson` to the absolute path of the DSH runtime's `package.json` that resolves `@deepseek-ai/dsh-llm-pi-ai` and `@deepseek-ai/dsh-tool-subagent`. Verification uses isolated loopback fixtures and cannot start the model launchers. To verify the real prerequisites without loading a model, run the following with the configured Python. A busy port or a running engine causes preflight to fail without taking ownership of an existing process.

```powershell
& $python -B .\halo.py preflight
& $python -B .\halo.py preflight --capped
& $python -B .\worker.py preflight
```

For an intentional deployment, close the two DSH surfaces, compare the staged candidates with your originals, then run `node .\profile.cjs install $web $desktop $records`. Reopen DSH through your normal launchers. If both presets already exist, the renderer expects the original pre-overlay profiles and will refuse to stage a duplicate. Roll back with `node .\profile.cjs rollback $web $desktop $records`. Install and rollback refuse to overwrite profiles that differ from the staged inputs. Keep the backups and keep the overlay path stable because the generated profiles include absolute module URLs.

## Startup and recovery

The full-memory lead requires 20 GiB free physical RAM and 56 GiB free Windows commit. The capped lead requires 32 GiB available RAM and 38 GiB free commit before startup and again after prefetch. Readiness requires the capped server and engine to have verified 20 GiB hard working-set maxima. The Windows prefetch touches the file ranges for 10,701 ranked experts and has a 125-second ceiling. The engine retains its 480-second startup deadline, with a 620-second end-to-end DSH wait.

The 5070 Ti preflight requires 18 GiB free RAM, 16 GiB free commit, and 14 GiB free GPU memory. It starts a remote listener on loopback 18181 with 12 GiB working-set maxima on the server and engine. Only Halo loopback port 8082 forwards to that listener. Both controllers retain the 5 GiB physical / 4 GiB commit safety floors and a 30-minute engine lease. The worker can be stopped early with `worker.py stop` using the configured launcher Python. It signals only the tagged remote run recorded by the controller. The two Halo lead variants are mutually exclusive. An existing Strata process or another listener is left to its owner. Installed deployment shortcuts and app profiles are outside this source overlay.

See [the verification record](../../docs/evidence/strata-paired-startup-2026-11-17/README.md) for prior real startup measurements and current no-model verification.
