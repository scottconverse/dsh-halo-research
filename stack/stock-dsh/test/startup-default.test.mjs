import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { restoreStartupDefault } from '../startup-default.mjs';

test('ordinary detached startup preserves the operator model selection', () => {
  const launcher = readFileSync(new URL('../start-dsh-detached.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(launcher, /restoreStartupDefault\s*\(/);
  assert.match(launcher, /ensureOutputBudgetPatch\(root\)/);
});

test('fresh startup restores local model, clears cloud effort, and preserves other settings', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-startup-default-'));
  try {
    const canonical = join(dir, 'canonical.yaml'), live = join(dir, 'live.yaml');
    writeFileSync(canonical, 'agent-default-model:\n  provider: lmstudio\n  model: halo-coder-q4km\n');
    writeFileSync(live, '# Keep this comment\nagent-default-model:\n  provider: ollama\n  model: deepseek-v4.1-flash:cloud\n  reasoningEffort: off\nllm-pi-ai:\n  providers:\n    google:\n      apiKeyEnv: GOOGLE_API_KEY\n');
    assert.equal(restoreStartupDefault(live, canonical), true);
    const result = readFileSync(live, 'utf8');
    assert.match(result, /provider: lmstudio\n  model: halo-coder-q4km/);
    assert.doesNotMatch(result, /reasoningEffort/);
    assert.match(result, /# Keep this comment/);
    assert.match(result, /apiKeyEnv: GOOGLE_API_KEY/);
    assert.equal(restoreStartupDefault(live, canonical), false);
    assert.equal(readFileSync(live, 'utf8'), result);
    writeFileSync(canonical, 'agent-default-model: [invalid');
    assert.throws(() => restoreStartupDefault(live, canonical), /YAML is invalid/);
    assert.equal(readFileSync(live, 'utf8'), result);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
