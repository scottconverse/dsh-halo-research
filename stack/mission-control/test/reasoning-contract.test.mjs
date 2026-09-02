import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const missionControlFile = process.env.HALO_MC_SOURCE_UNDER_TEST
  ? path.resolve(process.env.HALO_MC_SOURCE_UNDER_TEST)
  : path.join(here, '..', 'mission-control.mjs');
const source = fs.readFileSync(missionControlFile, 'utf8');

function contractFunctions() {
  const startMark = '/*__REASONING_CONTRACT_START__*/';
  const endMark = '/*__REASONING_CONTRACT_END__*/';
  const start = source.indexOf(startMark);
  const end = source.indexOf(endMark);
  assert.notEqual(start, -1, 'reasoning contract start marker is present');
  assert.notEqual(end, -1, 'reasoning contract end marker is present');
  assert.ok(end > start, 'reasoning contract markers are ordered');
  const body = source.slice(start + startMark.length, end);
  return new Function(`${body}\nreturn { parseAgentDefaultRoute, describeModelReasoning, describeConfiguredReasoningEffort, resolveCurrentRouteReasoning, buildReasoningRows };`)();
}

test('DSH default route without an effort stays provider-owned', () => {
  const { parseAgentDefaultRoute } = contractFunctions();
  assert.deepEqual(parseAgentDefaultRoute(`
agent-default-model:
  provider: lmstudio
  model: halo/qwen3.6-35b-a3b
`), {
    provider: 'lmstudio',
    model: 'halo/qwen3.6-35b-a3b',
    reasoningEffort: null,
  });
});

test('an explicit DSH effort is reported exactly rather than renamed', () => {
  const { parseAgentDefaultRoute } = contractFunctions();
  assert.deepEqual(parseAgentDefaultRoute(`
agent-default-model:
  provider: another-provider
  model: model-with-real-levels
  reasoningEffort: high
`), {
    provider: 'another-provider',
    model: 'model-with-real-levels',
    reasoningEffort: 'high',
  });
});

test('an omitted effort is configuration absence, not a claim about a future request', () => {
  const { describeConfiguredReasoningEffort } = contractFunctions();
  assert.deepEqual(describeConfiguredReasoningEffort({ reasoningEffort: null }), {
    value: 'none',
    basis: 'adapter/provider resolves at request time',
  });
  assert.doesNotMatch(source, /not sent \(provider-owned\)/);
});

test('LM Studio boolean enableThinking is the effective alias default', () => {
  const { describeModelReasoning } = contractFunctions();
  assert.deepEqual(describeModelReasoning(`
metadata:
  reasoning: true
customFields:
  - key: enableThinking
    type: boolean
    defaultValue: false
`), {
    value: 'off',
    basis: 'LM Studio enableThinking default=false',
  });
});

test('reasoning capability alone is not misreported as enabled', () => {
  const { describeModelReasoning } = contractFunctions();
  assert.deepEqual(describeModelReasoning('metadata:\n  reasoning: true\n'), {
    value: 'provider default',
    basis: 'reasoning-capable; no on/off default is declared',
  });
});

test('a non-reasoning model is reported as off', () => {
  const { describeModelReasoning } = contractFunctions();
  assert.deepEqual(describeModelReasoning('metadata:\n  reasoning: false\n'), {
    value: 'off',
    basis: 'model declares reasoning=false',
  });
});

test('Halo configuration does not advertise fictional graded efforts', () => {
  assert.doesNotMatch(source, /\['low','medium','high','xhigh'\]/);
  assert.doesNotMatch(source, /enum:\s*\['low',\s*'medium',\s*'high',\s*'xhigh'\]/);

  const settings = fs.readFileSync(path.join(here, '..', '..', 'halo-settings.yaml'), 'utf8');
  assert.doesNotMatch(settings, /^\s*reasoningEfforts?:/m);
});

test('versioned daily aliases expose the effective boolean defaults honestly', () => {
  const { describeModelReasoning } = contractFunctions();
  const models = path.join(here, '..', '..', 'lmstudio-models', 'halo');
  const brain = fs.readFileSync(path.join(models, 'qwen3.6-35b-a3b', 'model.yaml'), 'utf8');
  const worker = fs.readFileSync(path.join(models, 'qwen3-coder-30b-a3b-q4km', 'model.yaml'), 'utf8');
  assert.equal(describeModelReasoning(brain).value, 'off');
  assert.deepEqual(describeModelReasoning(worker), {
    value: 'off',
    basis: 'model declares reasoning=false',
  });
});

test('raw current route remains provider-owned while daily aliases stay separately labeled', () => {
  const { buildReasoningRows, describeModelReasoning } = contractFunctions();
  const brain = describeModelReasoning(`
metadata:
  reasoning: true
customFields:
  - key: enableThinking
    defaultValue: false
`);
  const worker = describeModelReasoning('metadata:\n  reasoning: false\n');
  const rows = buildReasoningRows({
    route: { provider: 'lmstudio', model: 'unsloth/qwen3.8-27b', reasoningEffort: null },
    definitions: {},
    settingsSource: 'settings.yaml',
    brainContract: brain,
    brainSource: 'brain.yaml',
    workerContract: worker,
    workerSource: 'worker.yaml',
  });
  assert.deepEqual(rows.slice(0, 3).map(row => [row.label, row.value]), [
    ['Configured DSH route', 'lmstudio/unsloth/qwen3.8-27b'],
    ['Configured DSH reasoning effort', 'none — adapter/provider resolves at request time'],
    ['Current model reasoning contract', 'provider-owned — unknown from static DSH configuration; no exact alias contract is declared for this route'],
  ]);
  assert.match(rows[3].label, /Daily brain alias/);
  assert.match(rows[3].value, /^off —/);
  assert.doesNotMatch(rows[2].value, /\b(?:off|high|xhigh)\b/);
});

test('an exact current Halo alias resolves its boolean contract from that alias only', () => {
  const { buildReasoningRows, describeModelReasoning } = contractFunctions();
  const models = path.join(here, '..', '..', 'lmstudio-models', 'halo');
  const brainFile = path.join(models, 'qwen3.6-35b-a3b', 'model.yaml');
  const workerFile = path.join(models, 'qwen3-coder-30b-a3b-q4km', 'model.yaml');
  const brainRaw = fs.readFileSync(brainFile, 'utf8');
  const workerRaw = fs.readFileSync(workerFile, 'utf8');
  const route = { provider: 'lmstudio', model: 'halo/qwen3.6-35b-a3b', reasoningEffort: null };
  const rows = buildReasoningRows({
    route,
    definitions: {
      'lmstudio/halo/qwen3.6-35b-a3b': { raw: brainRaw, source: brainFile },
    },
    settingsSource: 'settings.yaml',
    brainContract: describeModelReasoning(brainRaw),
    brainSource: brainFile,
    workerContract: describeModelReasoning(workerRaw),
    workerSource: workerFile,
  });
  assert.equal(rows[2].label, 'Current model reasoning contract');
  assert.equal(rows[2].value, 'off — LM Studio enableThinking default=false');
  assert.equal(rows[2].source, brainFile);
});

test('Mission Control installer records whether contract tests ran', () => {
  const installer = fs.readFileSync(path.join(here, '..', 'Install-HaloMissionControl.ps1'), 'utf8');
  assert.match(installer, /TestsRan\s*=\s*\$testsRan/);
  assert.match(installer, /TestResult\s*=\s*\$testResult/);
  assert.match(installer, /TestCommand\s*=\s*\$testCommand/);
});
