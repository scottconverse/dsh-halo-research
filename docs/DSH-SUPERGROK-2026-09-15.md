# SuperGrok in Halo DSH

Installed September 15, 2026 into the existing web profile at `C:\Users\scott\.dsh-stock\profiles\web`.

## Use it

In DSH, select the `xai-oauth` provider and **Grok 4.6** in the model picker. **Settings > xAI Grok** manages sign-in, sign-out and which account models appear. The saved default remains `lmstudio / halo-coder-q4km`.

The owner approved the xAI device-code flow. The account returned a live model list including Grok 4.5 and 4.6. A real DSH session using `xai-oauth / grok-4.6` returned `GROK_SUBSCRIPTION_OK` and completed normally. No `XAI_API_KEY` or API-key fallback was used. This confirms this account's OAuth inference access at the time of testing; future subscription limits and entitlements remain xAI's responsibility.

Credentials live only in `$DSH_HOME/.xai-oauth-auth.json`; they are excluded from source and recovery copies. No Grok CLI credentials were imported. The plugin provides automatic refresh; rotation was not separately tested. The native API-key `xai` route is still independent.

## Pinned plugin and alpha compatibility

Upstream: https://github.com/MirDie/dsh-xai at commit `5946301f992b7445d8dcb26bd9c89dc86246832b`, package 0.1.0.

The unmodified plugin logged in, but model selection on DSH 0.1.6-alpha.1 failed with `Cannot read properties of undefined (reading 'get')`. The alpha adapter requires `modelErrors`, which the older plugin did not supply. The tracked pnpm patch adds an empty map and the alpha's three stock image-budget defaults to the provider profile. Stock DSH source is unchanged. Text inference passed after applying this patch; image behavior and tool calling were not separately tested.

`stack/stock-dsh/web-profile/` preserves the exact profile package manifest, lockfile, pnpm policy and patch. The main deployment dependencies and existing Cordis overlay remain separate. The patch is automatically reapplied by frozen-lockfile installation; do not discard it on an upstream update until compatibility is checked.

## Restore or remove

To restore on this machine, stop DSH using the existing stop launcher. Copy the four files under `stack/stock-dsh/web-profile/` into `$DSH_HOME/profiles/web/`, preserving the `patches` subfolder. Keep the existing `cordis.yml` and `cordis.patch.yml`. With `DSH_HOME=C:\Users\scott\.dsh-stock`, run the pinned deployment CLI's `plugin --profile web install --frozen-lockfile`, then use the normal desktop start launcher. This assumes the main pinned DSH installation and its shared packages have already been restored. Sign in again if credentials are absent.

To disconnect, use **Settings > xAI Grok > Sign out**. To remove the provider entirely, use the pinned DSH CLI's `plugin --profile web remove dsh-xai` and restart through the desktop launcher. Removing a bundle alone does not delete its saved credential, so sign out first. No separately billed route is enabled automatically.

Evidence: [DSH response](evidence/dsh-supergrok-2026-09-15.json).

## Later compatibility correction

The original text-only 4.6 check did not validate every model offered by live account discovery. The 4.20 non-reasoning variant inherited invalid reasoning metadata; the tracked patch now clears it. Real tool-call checks and the current verification limits are documented in [the cloud repair record](HALO-DSH-IMPLEMENTATION-2026-09-15-CLOUD-REPAIR.md). Preserve the updated pnpm patch and matching lockfile when restoring.
