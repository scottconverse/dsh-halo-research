import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const stockDsh = path.join(here, '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(stockDsh, 'package.json'), 'utf8'));
const settings = fs.readFileSync(path.join(stockDsh, 'settings.yaml'), 'utf8');

test('stock DSH pins the reviewed release instead of carrying the retired picker override', () => {
  assert.equal(manifest.dependencies['@deepseek-ai/dsh'], '0.1.5-rc.2');
  assert.equal(fs.existsSync(path.join(stockDsh, 'Install-HaloPickerOverride.ps1')), false);
  assert.equal(fs.existsSync(path.join(stockDsh, 'packages', 'deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2.tgz')), false);
});

test('stock model catalog contains exactly the two approved Halo aliases', () => {
  const ids = [...settings.matchAll(/^\s*- id:\s*([^\s#]+)/gm)].map(match => match[1]);
  assert.deepEqual(ids, ['halo-brain-35b', 'halo-coder-q4km']);
  assert.match(settings, /model:\s*halo-coder-q4km/);
  assert.match(settings, /allowedModels:[\s\S]*?model:\s*halo-brain-35b[\s\S]*?model:\s*halo-coder-q4km/);
});

test('approved aliases share the bounded stock context and response contract', () => {
  assert.equal((settings.match(/contextWindow:\s*32768/g) || []).length, 2);
  assert.equal((settings.match(/maxTokens:\s*8192/g) || []).length, 2);
  assert.equal((settings.match(/reasoningEfforts:\s*false/g) || []).length, 2);
});
