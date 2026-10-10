import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

// Deployment-scoped opt-out. Other pi-ai consumers keep the upstream behavior.
export const OPT_OUT = 'HALO_DSH_DISABLE_ESTIMATED_OUTPUT_CLAMP';
export const PATCHED_VERSION = '1.0.2';
const original = 'export function clampMaxTokensToContext(model, context, maxTokens) {\n';
const replacement = original +
  '    // Halo DSH: explicit output budgets must not be overwritten by a character estimate.\n' +
  `    if (process.env.${OPT_OUT} === "1")\n` +
  '        return Math.max(MIN_MAX_TOKENS, maxTokens);\n';

export function patchSource(source) {
  const normalized = source.replace(/\r\n/g, '\n');
  if (normalized.includes(replacement)) return normalized;
  if (normalized.includes(OPT_OUT) || normalized.split(original).length !== 2)
    throw new Error('Unexpected pi-ai output-budget implementation; refusing a blind patch.');
  if (!normalized.includes('model.contextWindow - estimateContextTokens(context).tokens - CONTEXT_SAFETY_TOKENS'))
    throw new Error('Expected pi-ai context clamp is missing; review this SDK before patching.');
  return normalized.replace(original, replacement);
}

export function locateSdk(root = dirname(fileURLToPath(import.meta.url))) {
  const cli = createRequire(join(root, 'package.json')).resolve('@deepseek-ai/dsh/package.json');
  const adapter = createRequire(cli).resolve('@deepseek-ai/dsh-llm-pi-ai/package.json');
  const sdk = join(dirname(adapter), '..', '..', '@earendil-works', 'pi-ai');
  const version = JSON.parse(readFileSync(join(sdk, 'package.json'), 'utf8')).version;
  if (version !== PATCHED_VERSION) throw new Error(`Unreviewed pi-ai version ${version}; expected ${PATCHED_VERSION}.`);
  return sdk;
}

export function ensureOutputBudgetPatch(root) {
  const sdk = locateSdk(root);
  const target = join(sdk, 'dist', 'api', 'simple-options.js');
  const before = readFileSync(target, 'utf8');
  const after = patchSource(before);
  if (before.replace(/\r\n/g, '\n') === after) return { changed: false, version: PATCHED_VERSION };
  const backupDir = join(root || dirname(fileURLToPath(import.meta.url)), 'runtime-patch-backups');
  mkdirSync(backupDir, { recursive: true });
  const backup = join(backupDir, `pi-ai-${PATCHED_VERSION}-simple-options.js.original`);
  if (!existsSync(backup)) writeFileSync(backup, before);
  writeFileSync(target, after);
  if (!readFileSync(target, 'utf8').includes(replacement)) throw new Error('Patch readback failed.');
  return { changed: true, version: PATCHED_VERSION };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(ensureOutputBudgetPatch()));
}
