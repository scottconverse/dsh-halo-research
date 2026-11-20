import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPresets, installedOptions, syncPresets } from '../stock-dsh/preset-sync.mjs';
import { ensureWebConnectionGuard } from '../stock-dsh/web-connection-guard.mjs';
import { ensureOutputBudgetPatch } from '../stock-dsh/output-budget-patch.mjs';
import { ensureAdapterIntegrityPatch } from '../stock-dsh/adapter-integrity-patch.mjs';
import { ensureWebFetchEvidencePatch } from '../stock-dsh/web-fetch-evidence-patch.mjs';
import { ensureInterruptedCommandRecoveryPatch } from '../stock-dsh/interrupted-command-recovery-patch.mjs';

export function syncWebPresets(root) {
  return syncPresets(installedOptions(root, join(root, 'home'))).length;
}

export function prepareWebRuntime(root) {
  const presets = checkPresets(installedOptions(root, join(root, 'home')));
  if (presets.some(preset => preset.drift)) {
    throw new Error('Installed Web presets differ from their recovery mirrors. Review home/profiles/web/cordis.patch.yml, then run web-runtime.mjs sync as documented.');
  }
  ensureWebConnectionGuard(root);
  ensureOutputBudgetPatch(root);
  ensureAdapterIntegrityPatch(root);
  ensureWebFetchEvidencePatch(root);
  ensureInterruptedCommandRecoveryPatch(root);
  return presets.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const command = process.argv[2];
  if (command === 'check') console.log(`Web runtime verified with ${prepareWebRuntime(root)} preset mirrors.`);
  else if (command === 'sync') console.log(`Synchronized ${syncWebPresets(root)} Web preset mirrors.`);
  else throw new Error('Use web-runtime.mjs check or sync');
}
