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
const providers = parse(settings)['llm-pi-ai'].providers;
const startLauncher = fs.readFileSync(path.join(stockDsh, 'Start-StockDSH.ps1'), 'utf8');
const desktopLauncher = fs.readFileSync(path.join(stockDsh, 'Launch-StockDSH.ps1'), 'utf8');

test('stock DSH pins the reviewed release instead of carrying the retired picker override', () => {
  assert.equal(manifest.dependencies['@deepseek-ai/dsh'], '0.1.6-alpha.1');
  assert.equal(fs.existsSync(path.join(stockDsh, 'Install-HaloPickerOverride.ps1')), false);
  assert.equal(fs.existsSync(path.join(stockDsh, 'packages', 'deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2.tgz')), false);
});

test('Web catalog retains saved-session aliases and defaults new sessions to cloud', () => {
  const ids = localModels.map(model => model.id);
  assert.deepEqual(ids, ['halo-coder-q4km', 'halo/qwen3-coder-30b-a3b-q4km', 'halo-brain-35b', 'halo/qwen3.6-35b-a3b']);
  assert.deepEqual(parse(settings)['agent-default-model'], { provider: 'ollama', model: 'deepseek-v4.1-flash:cloud' });
  assert.deepEqual(providers.ollama.models.map(model => model.id), [
    'deepseek-v4.1-flash:cloud', 'glm-5.3:cloud', 'kimi-k3:cloud', 'minimax-m3:cloud', 'glm-5.3-flash:cloud',
  ]);
  assert.equal(providers.google, undefined);
  assert.equal(providers['xai-oauth'], undefined);
});

test('approved aliases share the bounded stock context and response contract', () => {
  const aliases = localModels.filter(model => ['halo-brain-35b', 'halo-coder-q4km'].includes(model.id));
  assert.ok(aliases.every(model => model.contextWindow === 131072));
  assert.ok(aliases.every(model => model.maxTokens === 8192));
  assert.equal(aliases.find(model => model.id === 'halo-coder-q4km').reasoningEfforts, false);
  assert.deepEqual(aliases.find(model => model.id === 'halo-brain-35b').reasoningEfforts, { off: 'none', high: 'high' });
});

test('desktop launcher reuses a single DSH listener and opens both operator pages in Chrome', () => {
  assert.match(startLauncher, /\$listeners\s*=\s*@\(Get-PortListeners\s+\$Port\)/);
  assert.match(desktopLauncher, /ArgumentList\s+@\('--new-window',\s*\$missionControlUri,\s*\$dshLaunchUri\)/);
});
