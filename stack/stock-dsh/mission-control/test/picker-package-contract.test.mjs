import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const stockDsh = path.join(here, '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(stockDsh, 'package.json'), 'utf8'));
const settings = fs.readFileSync(path.join(stockDsh, 'settings.yaml'), 'utf8');
const require = createRequire(import.meta.url);
const { parse } = createRequire(require.resolve('@deepseek-ai/dsh/package.json'))('yaml');
const localModels = Object.entries(parse(settings)['llm-pi-ai'].providers)
  .filter(([provider]) => ['lmstudio', 'lmstudio-brain'].includes(provider))
  .flatMap(([, provider]) => provider.models);
const startLauncher = fs.readFileSync(path.join(stockDsh, 'Start-StockDSH.ps1'), 'utf8');
const desktopLauncher = fs.readFileSync(path.join(stockDsh, 'Launch-StockDSH.ps1'), 'utf8');

test('stock DSH pins the reviewed release instead of carrying the retired picker override', () => {
  assert.equal(manifest.dependencies['@deepseek-ai/dsh'], '0.1.6-alpha.1');
  assert.equal(fs.existsSync(path.join(stockDsh, 'Install-HaloPickerOverride.ps1')), false);
  assert.equal(fs.existsSync(path.join(stockDsh, 'packages', 'deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2.tgz')), false);
});

test('stock model catalog contains exactly the two approved Halo aliases', () => {
  const ids = localModels.map(model => model.id);
  assert.deepEqual(ids, ['halo-brain-35b', 'halo-coder-q4km']);
  assert.match(settings, /model:\s*halo-coder-q4km/);
  assert.match(settings, /allowedModels:[\s\S]*?model:\s*halo-brain-35b[\s\S]*?model:\s*halo-coder-q4km/);
});

test('approved aliases share the bounded stock context and response contract', () => {
  assert.ok(localModels.every(model => model.contextWindow === 131072));
  assert.ok(localModels.every(model => model.maxTokens === 8192));
  assert.equal((settings.match(/reasoningEfforts:\s*false/g) || []).length, 1);
  assert.match(settings, /reasoningEfforts:\s*\n\s+off: none\s*\n\s+high: high/);
});

test('desktop launcher reuses a single DSH listener and opens both operator pages in Chrome', () => {
  assert.match(startLauncher, /\$listeners\s*=\s*@\(Get-PortListeners\s+\$Port\)/);
  assert.match(desktopLauncher, /ArgumentList\s+@\('--new-window',\s*\$missionControlUri,\s*\$dshLaunchUri\)/);
});
