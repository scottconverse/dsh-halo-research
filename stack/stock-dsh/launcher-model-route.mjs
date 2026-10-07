import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
function loadYaml() {
  const candidates = [
    '@deepseek-ai/dsh/lib/bin.js',
    '@deepseek-ai/dsh/package.json',
  ];
  for (const specifier of candidates) {
    try {
      const dshRequire = createRequire(require.resolve(specifier));
      return dshRequire('yaml');
    } catch {
      // Try the next resolution context.
    }
  }
  return require('yaml');
}
const { parseDocument } = loadYaml();

function field(block, name) {
  const match = String(block || '').match(new RegExp('^[ \\t]+' + name + ':[ \\t]*([^#\\r\\n]+)', 'm'));
  const value = match?.[1]?.trim() || null;
  return value && /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value;
}

// Parse only the selected agent-default-model route. This accepts both the
// live DSH 0.2 profile row and the legacy flat settings shape.
export function parseSelectedRoute(text) {
  const source = parseConfig(text);
  const selection = Array.isArray(source)
    ? source.findLast(row => row?.id === 'agent-default-model')?.config
    : source?.['agent-default-model'];
  if (typeof selection?.provider !== 'string' || typeof selection?.model !== 'string' ||
      !selection.provider || !selection.model)
    throw new Error('The selected route is incomplete: agent-default-model must declare provider and model.');
  return { provider: selection.provider, model: selection.model,
    reasoningEffort: selection.reasoningEffort ?? null };
}

function parseConfig(text) {
  const doc = parseDocument(String(text || ''));
  if (doc.errors.length) {
    throw new Error('The selected route configuration YAML is invalid: ' + doc.errors.map(error => error.message).join('; '));
  }
  return doc.toJSON();
}

export function readProviderEnvelope(text, provider) {
  const config = parseConfig(text);
  const rows = Array.isArray(config) ? config : null;
  const providerCatalog = rows
    ? rows.findLast(row => row?.id === 'llm-pi-ai')?.config?.providers
    : config?.['llm-pi-ai']?.providers;
  const selectedProvider = providerCatalog?.[provider];
  return selectedProvider ?? null;
}

export function selectedTransport(selected, provider) {
  const model = provider?.models?.find(row => row?.id === selected.model);
  let url;
  try { url = new URL(model?.baseURL ?? provider?.baseURL); } catch { }
  return url?.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    && url.port === '1234' ? 'lmstudio' : 'provider-managed';
}

function residentMatches(resident, selected) {
  const identity = [resident?.identifier, resident?.modelKey].filter(Boolean).map(String);
  return identity.includes(selected.model);
}

function residentEnvelope(provider, resident) {
  const configuredModel = (provider?.models || []).find(model => model?.id === resident?.modelKey)
    || (provider?.models || []).find(model => model?.id === resident?.identifier);
  const expectedContext = Number(configuredModel?.contextWindow ?? provider?.defaultContextWindow);
  const expectedParallel = Number(provider?.defaultParallel ?? 1);
  const actualContext = Number(resident?.contextLength ?? resident?.context);
  const actualParallel = Number(resident?.parallel);
  return { expectedContext, expectedParallel, actualContext, actualParallel };
}

export function validateSelectedRoute({ selected, providerConfig, residentModels = [] }) {
  if (!selected?.provider || !selected?.model) {
    throw new Error('The selected route is incomplete: provider and model are required.');
  }
  if (selected.provider === 'ollama' && /:cloud$/.test(selected.model)) {
    return {
      kind: 'cloud',
      selected,
      residentModels: Array.isArray(residentModels) ? residentModels : [],
      message: `Selected route ${selected.provider}/${selected.model} is cloud; LM Studio residency was not inspected or changed.`,
    };
  }
  if (selectedTransport(selected, providerConfig) !== 'lmstudio') return { kind: 'provider-managed', selected,
    message: `Selected route ${selected.provider}/${selected.model} manages its own model availability; LM Studio residency was not inspected or changed.` };
  const residents = Array.isArray(residentModels) ? residentModels : [];
  const matches = residents.filter(resident => residentMatches(resident, selected));
  if (matches.length === 0) {
    const residentNames = residents.map(resident => resident?.identifier || resident?.modelKey).filter(Boolean).join(', ') || 'none';
    throw new Error(`Selected local route ${selected.provider}/${selected.model} is not resident in LM Studio; resident models: ${residentNames}. Load the selected model manually or select a resident model. This launcher will not load, unload, or replace any model.`);
  }
  if (matches.length > 1) {
    throw new Error(`Selected local route ${selected.provider}/${selected.model} matches ${matches.length} resident models; refusing an ambiguous route without mutation.`);
  }
  const resident = matches[0];
  const envelope = residentEnvelope(providerConfig, resident);
  if (Number.isFinite(envelope.expectedContext) && envelope.actualContext !== envelope.expectedContext) {
    throw new Error(`Selected local route ${selected.provider}/${selected.model} is resident with contextLength=${resident.contextLength ?? resident.context ?? 'unknown'}, but the selected profile expects ${envelope.expectedContext}. Unload/reload it manually with the selected context and parallel settings; this launcher will not mutate residency.`);
  }
  if (Number.isFinite(envelope.expectedParallel) && envelope.actualParallel !== envelope.expectedParallel) {
    throw new Error(`Selected local route ${selected.provider}/${selected.model} is resident with parallel=${resident.parallel ?? 'unknown'}, but the selected profile expects ${envelope.expectedParallel}. Unload/reload it manually with the selected context and parallel settings; this launcher will not mutate residency.`);
  }
  return {
    kind: 'local',
    selected,
    residentModels: residents,
    resident,
    message: `Selected local route ${selected.provider}/${selected.model} is resident with the selected capacity envelope; all other resident models were preserved.`,
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[i + 1];
  return args;
}

const invokedDirectly = process.argv[1] && (
  ['route', 'provider', 'validate', 'transport'].includes(process.argv[1]) ||
  import.meta.url === pathToFileURL(process.argv[1]).href
);

if (invokedDirectly) {
  let modeIndex = process.argv.findIndex(arg => ['route', 'provider', 'validate', 'transport'].includes(arg));
  if (modeIndex < 0) modeIndex = 1;
  const mode = process.argv[modeIndex];
  const args = parseArgs(process.argv.slice(modeIndex + 1));
  let result;
  if (mode === 'route') {
    const settings = args.settingsFile ? readFileSync(args.settingsFile, 'utf8') : args.settings;
    if (!settings) throw new Error('route requires --settings <yaml-text> or --settings-file <path>');
    result = parseSelectedRoute(settings);
  } else if (mode === 'provider') {
    const settings = args.settingsFile ? readFileSync(args.settingsFile, 'utf8') : args.settings;
    if (!settings) throw new Error('provider requires --settings <yaml-text> or --settings-file <path> and --provider <name>');
    if (!args.provider) throw new Error('provider requires --provider <name>');
    result = readProviderEnvelope(settings, args.provider);
  } else if (mode === 'transport') {
    const settings = readFileSync(args.settingsFile, 'utf8');
    const selected = parseSelectedRoute(settings);
    const provider = readProviderEnvelope(settings, selected.provider);
    result = { kind: selectedTransport(selected, provider) };
  } else if (mode === 'validate') {
    const settings = args.settingsFile ? readFileSync(args.settingsFile, 'utf8') : null;
    const selected = settings ? parseSelectedRoute(settings) : JSON.parse(args.selected);
    const providerConfig = settings ? readProviderEnvelope(settings, selected.provider) : JSON.parse(args.provider);
    const residentModels = args.residents ? readJson(args.residents) : [];
    result = validateSelectedRoute({ selected, providerConfig, residentModels });
  } else {
    throw new Error('Usage: node launcher-model-route.mjs <route|provider|validate> ...');
  }
  process.stdout.write(JSON.stringify(result));
}
