const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');

const yaml = require('yaml');
const parse = content => yaml.parse(content, {
  customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: source => source }],
});
const policy = pathToFileURL(path.join(__dirname, 'delegation-policy.mjs')).href;
const autoStart = pathToFileURL(path.join(__dirname, 'autostart.mjs')).href;
const provider = {
  displayName: 'Strata 5070 Ti',
  apiKeyEnv: 'STRATA_LOCAL_API_KEY',
  api: 'openai-completions',
  baseURL: 'http://127.0.0.1:8082/v1',
  models: [{
    id: 'qwen3.8-flash-next-iq3_s',
    name: 'Qwen Next (5070 Ti)',
    contextWindow: 32768,
    maxTokens: 8192,
    input: ['text'],
  }],
};
const workerPresetId = 'halo-preset-local-5070';

function format(value, spaces) {
  const indent = ' '.repeat(spaces);
  return yaml.stringify(value, { lineWidth: 0 }).trimEnd().split('\n').map(line => indent + line).join('\n');
}

function makeCandidate(original) {
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const before = original.replaceAll('\r\n', '\n');
  const baseline = parse(before);
  const basePreset = baseline.flatMap(row => row.insert ?? []).find(row => row.id === 'halo-preset-local');
  assert(basePreset);
  const workerPreset = structuredClone(basePreset);
  workerPreset.id = workerPresetId;
  workerPreset.config.id = 'local-5070';
  workerPreset.config.name = 'Halo + 5070 Ti';
  workerPreset.config.description = 'Select Local Qwen as lead. Delegate independent tasks to the 5070 Ti when its Strata route is ready.';
  // Carry over Halo's regular tools. Give this preset exactly one delegation route.
  const plugins = workerPreset.config.plugins;
  const index = plugins.findIndex(row => row.id === 'delegation');
  assert(index >= 0);
  const controls = plugins[index].config.filter(row => ['tool-subagent-control', 'tool-subagent-list-agents'].includes(row.id));
  assert.equal(controls.length, 2);
  const workerTools = [{ id: 'halo-5070-delegation-policy', name: policy }, ...controls, {
    id: 'tool-subagent',
    name: '@deepseek-ai/dsh-tool-subagent',
    config: {
      provider: 'spawn',
      toolName: 'delegate_to_5070ti',
      agentPreset: 'local-lean',
      maxDepth: 1,
      agentOptions: { provider: 'strata-5070ti', model: provider.models[0].id, maxTokens: 8192 },
    },
  }];
  plugins.splice(index, 1, ...workerTools);
  const providerMarker = /^      strata-local:$/m;
  const presetMarker = /^    - id: halo-preset-local$/m;
  assert(providerMarker.test(before) && presetMarker.test(before));
  const start = before.search(presetMarker);
  const end = before.indexOf('\n    - id: halo-preset-local-codex', start);
  assert(end > start);
  const rawPreset = before.slice(start, end);
  const delegation = /^          - id: delegation\n[\s\S]*?(?=^          - id: )/m;
  assert(delegation.test(rawPreset));
  const insertion = rawPreset
    .replace(presetMarker, '    - id: ' + workerPresetId)
    .replace(/^        id: local$/m, '        id: local-5070')
    .replace(/^        name: Halo local$/m, format({
      name: workerPreset.config.name,
      description: workerPreset.config.description,
    }, 8))
    .replace(delegation, format(workerTools, 10) + '\n\n');
  const result = before
    .replace(providerMarker, marker => format({ 'strata-5070ti': provider }, 6) + '\n' + marker)
    .replace(presetMarker, marker => insertion + '\n' + marker);
  const parsed = parse(result);
  const row = parsed.find(item => item.id === 'llm-pi-ai');
  assert.deepEqual(row.config.providers['strata-5070ti'], provider);
  delete row.config.providers['strata-5070ti'];
  const presetBlock = parsed.find(item => item.insert?.some(entry => entry.id === workerPresetId));
  assert.deepEqual(presetBlock.insert.find(entry => entry.id === workerPresetId), workerPreset);
  presetBlock.insert = presetBlock.insert.filter(entry => entry.id !== workerPresetId);
  assert.deepEqual(parsed, baseline, 'Only the new model route and preset may change');
  return result.replaceAll('\n', eol);
}

function addAutoStart(original) {
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const text = original.replaceAll('\r\n', '\n');
  const baseline = parse(text);
  const providerFrom = baseline.find(row => row.id === 'llm-pi-ai').config.providers['strata-local'];
  const lead = structuredClone(providerFrom);
  lead.displayName = 'Strata on Halo (auto-start)';
  lead.models.find(model => model.id === provider.models[0].id).name = 'Local Qwen (auto-start)';
  const hook = { insert: [{ id: 'halo-strata-auto-start', name: autoStart }] };
  const providerMarker = /^      strata-local:$/m;
  assert(providerMarker.test(text) && text.includes('Select Local Qwen as lead.'));
  const result = text
    .replace(providerMarker, marker => format({ 'strata-halo-auto': lead }, 6) + '\n' + marker)
    .replace('Select Local Qwen as lead.', 'Select Local Qwen (auto-start) as lead.')
    .trimEnd() + '\n\n' + format([hook], 0) + '\n';
  const parsed = parse(result);
  assert.deepEqual(parsed.pop(), hook);
  const providers = parsed.find(row => row.id === 'llm-pi-ai').config.providers;
  assert.deepEqual(providers['strata-halo-auto'], lead);
  delete providers['strata-halo-auto'];
  const preset = parsed.flatMap(row => row.insert ?? []).find(row => row.id === workerPresetId);
  preset.config.description = preset.config.description.replace('Local Qwen (auto-start)', 'Local Qwen');
  assert.deepEqual(parsed, baseline);
  return result.replaceAll('\n', eol);
}

function addCappedPair(original) {
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const text = original.replaceAll('\r\n', '\n');
  const baseline = parse(text);
  const providers = baseline.find(row => row.id === 'llm-pi-ai').config.providers;
  const capped = structuredClone(providers['strata-halo-auto']);
  capped.displayName = 'Strata on Halo (32K capped)';
  capped.baseURL = 'http://127.0.0.1:8083/v1';
  const model = capped.models.find(row => row.id === provider.models[0].id);
  Object.assign(model, {
    name: 'Local Qwen (32K capped auto-start)', contextWindow: 32768, maxTokens: 8192, input: ['text'],
  });
  const block = /^    - id: halo-preset-local-5070\n[\s\S]*?(?=^    - id: halo-preset-local$)/m;
  const normalPair = text.match(block)?.[0];
  assert(normalPair);
  const fullDescription = 'Full-memory Halo Strata lead with a 5070 Ti worker.';
  const cappedDescription = '32K capped Halo Strata lead with a 5070 Ti worker.';
  function describe(raw, description) {
    return raw.replace(/^        description: .*$/m, '        description: ' + description);
  }
  const cappedPair = describe(normalPair, cappedDescription)
    .replace(/^    - id: halo-preset-local-5070$/m, '    - id: halo-preset-local-5070-capped')
    .replace(/^        id: local-5070$/m, '        id: local-5070-capped')
    .replace(/^        name: Halo \+ 5070 Ti$/m, '        name: Halo + 5070 Ti (32K capped)');
  const result = text.replace(block, () => describe(normalPair, fullDescription) + cappedPair)
    .replace(/^      strata-halo-auto:$/m, marker => format({ 'strata-halo-capped': capped }, 6) + '\n' + marker);
  const pairs = baseline.find(row => row.insert?.some(entry => entry.id === workerPresetId)).insert;
  const index = pairs.findIndex(row => row.id === workerPresetId);
  const full = pairs[index];
  full.config.description = fullDescription;
  const alternate = structuredClone(full);
  alternate.id += '-capped';
  alternate.config.id += '-capped';
  alternate.config.name += ' (32K capped)';
  alternate.config.description = cappedDescription;
  pairs.splice(index + 1, 0, alternate);
  providers['strata-halo-capped'] = capped;
  assert.deepEqual(parse(result), baseline);
  return result.replaceAll('\n', eol);
}

const [action, web, desktop, records] = process.argv.slice(2);
assert(['stage', 'install', 'rollback'].includes(action) && web && desktop && records,
  'Usage: node profile.cjs stage|install|rollback WEB_PATCH DESKTOP_PATCH RECORDS_DIR');
const targets = { web: fs.realpathSync(web), desktop: fs.realpathSync(desktop) };
assert.notEqual(targets.web.toLowerCase(), targets.desktop.toLowerCase());
const archive = path.resolve(records);
const entries = Object.entries(targets).map(([name, file]) => ({
  file,
  original: path.join(archive, name + '.before.yml'),
  candidate: path.join(archive, name + '.paired.yml'),
}));
if (action === 'stage') fs.mkdirSync(archive, { recursive: true });
const transform = original => addCappedPair(addAutoStart(makeCandidate(original)));
if (action === 'stage') {
  for (const { file, original, candidate } of entries) {
    const data = fs.readFileSync(file, 'utf8');
    const updated = transform(data);
    if (fs.existsSync(original)) assert.equal(fs.readFileSync(original, 'utf8'), data);
    else fs.writeFileSync(original, data, { flag: 'wx' });
    if (fs.existsSync(candidate)) assert.equal(fs.readFileSync(candidate, 'utf8'), updated);
    else fs.writeFileSync(candidate, updated, { flag: 'wx' });
  }
} else {
  const source = action === 'install' ? 'candidate' : 'original';
  const expected = action === 'install' ? 'original' : 'candidate';
  const changed = [];
  for (const entry of entries) {
    assert(fs.readFileSync(entry.file).equals(fs.readFileSync(entry[expected])), 'Profile changed since staging: ' + entry.file);
  }
  function replace(entry, from) {
    const pending = entry.file + '.halo-5070-' + process.pid + '.tmp';
    fs.copyFileSync(entry[from], pending, fs.constants.COPYFILE_EXCL);
    try {
      fs.renameSync(pending, entry.file);
    } catch (error) {
      fs.unlinkSync(pending);
      throw error;
    }
  }
  try {
    for (const entry of entries) {
      replace(entry, source);
      changed.push(entry);
      assert(fs.readFileSync(entry.file).equals(fs.readFileSync(entry[source])));
    }
  } catch (error) {
    for (const entry of changed.reverse()) replace(entry, expected);
    throw error;
  }
}
console.log(action + ': Web and Desktop profiles verified');
