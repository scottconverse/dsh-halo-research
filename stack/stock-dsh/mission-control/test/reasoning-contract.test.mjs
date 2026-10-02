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
const stockDshDir = path.join(here, '..', '..');
const stockSettings = fs.readFileSync(path.join(stockDshDir, 'web-profile', 'cordis.patch.yml'), 'utf8');

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

test('Halo Web profile exposes only its declared reasoning contracts', () => {
  assert.doesNotMatch(source, /\['low','medium','high','xhigh'\]/);
  assert.doesNotMatch(source, /enum:\s*\['low',\s*'medium',\s*'high',\s*'xhigh'\]/);

  assert.doesNotMatch(stockSettings, /reasoningEfforts:\s*\[(?:[^\]]*\b(?:low|medium|high|xhigh)\b[^\]]*)\]/);
  assert.ok((stockSettings.match(/reasoningEfforts:\s*false/g) || []).length >= 1,
    'the profile retains explicitly non-thinking models');
  assert.match(stockSettings, /reasoningEfforts:\s*\n\s+off: none\s*\n\s+high: high/,
    '35B exposes only the verified off and thinking wire settings');
});

test('approved stock aliases expose their effective non-reasoning defaults honestly', () => {
  const { describeModelReasoning } = contractFunctions();
  const brain = 'metadata:\n  reasoning: false\n';
  const worker = 'metadata:\n  reasoning: false\n';
  assert.deepEqual(describeModelReasoning(brain), {
    value: 'off',
    basis: 'model declares reasoning=false',
  });
  assert.deepEqual(describeModelReasoning(worker), {
    value: 'off',
    basis: 'model declares reasoning=false',
  });
  assert.match(stockSettings, /- id:\s*halo\/qwen3\.6-35b-a3b-q6[\s\S]*?reasoningEfforts:/);
  assert.match(stockSettings, /- id:\s*halo-coder-q4km[\s\S]*?reasoningEfforts:\s*false/);
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
  const brainFile = 'settings.yaml: halo-brain-35b';
  const workerFile = 'settings.yaml: halo-coder-q4km';
  const brainRaw = 'metadata:\n  reasoning: false\n';
  const workerRaw = 'metadata:\n  reasoning: false\n';
  const route = { provider: 'lmstudio', model: 'halo-brain-35b', reasoningEffort: null };
  const rows = buildReasoningRows({
    route,
    definitions: {
      'lmstudio/halo-brain-35b': { raw: brainRaw, source: brainFile },
    },
    settingsSource: 'settings.yaml',
    brainContract: describeModelReasoning(brainRaw),
    brainSource: brainFile,
    workerContract: describeModelReasoning(workerRaw),
    workerSource: workerFile,
  });
  assert.equal(rows[2].label, 'Current model reasoning contract');
  assert.equal(rows[2].value, 'off — model declares reasoning=false');
  assert.equal(rows[2].source, brainFile);
});

test('Settings indexes reasoning contracts by configured DSH aliases as well as physical model keys', () => {
  const settingsDataAt = source.indexOf('function settingsData');
  assert.notEqual(settingsDataAt, -1);
  const settingsData = source.slice(settingsDataAt, source.indexOf('// ─────────────────────────── HTTP server', settingsDataAt));
  assert.match(settingsData, /\['web-fast\/' \+ DAILY_BRAIN\.identifier\]/);
  assert.match(settingsData, /\['lmstudio\/' \+ DAILY_WORKER\.identifier\]/);
  assert.match(settingsData, /\['web-fast\/' \+ DAILY_BRAIN\.modelKey\]/);
  assert.match(settingsData, /\['lmstudio\/' \+ DAILY_WORKER\.modelKey\]/);
});

test('settingsData indexes reasoning contracts by the configured DSH alias ids', () => {
  const start = source.indexOf('function settingsData(');
  const end = source.indexOf('// ─────────────────────────── HTTP server', start);
  assert.notEqual(start, -1);
  assert.ok(end > start);
  const settingsDataSource = source.slice(start, end);
  assert.match(settingsDataSource, /\['web-fast\/' \+ DAILY_BRAIN\.identifier\]/);
  assert.match(settingsDataSource, /\['lmstudio\/' \+ DAILY_WORKER\.identifier\]/);
  const configuredAlias = stockSettings.match(/- id:\s*agent-default-model[\s\S]*?model:\s*([^\s#]+)/)?.[1];
  assert.ok(configuredAlias, 'the Web profile declares an exact default model row');
});

test('Mission Control installer records whether contract tests ran', () => {
  const installer = fs.readFileSync(path.join(here, '..', 'Install-HaloMissionControl.ps1'), 'utf8');
  assert.match(installer, /TestsRan\s*=\s*\$testsRan/);
  assert.match(installer, /TestResult\s*=\s*\$testResult/);
  assert.match(installer, /TestCommand\s*=\s*\$testCommand/);
});
