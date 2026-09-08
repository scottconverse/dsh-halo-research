import { createHash } from 'node:crypto';

export const PROFILE_SCHEMA_VERSION = '1';

const VOLATILE_KEY = /^(?:pid|processId|residen(?:cy|t)|status|queued|token(?:s|Count)?|speed|throughput|cost|price|latency|duration|lastUsed(?:Time)?|loadedAt)$/i;

const own = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);

function text(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function id(value) {
  if (value && typeof value === 'object') return text(value.id ?? value.key ?? value.name);
  return text(value);
}

function field(value, source) {
  if (value === undefined) return { state: 'missing' };
  if (value === null || value === 'unknown') return { state: 'unknown' };
  return { state: 'observed', value: clean(value), ...(source ? { source } : {}) };
}

function inapplicable() {
  return { state: 'inapplicable' };
}

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value)
      .filter((key) => !VOLATILE_KEY.test(key) && value[key] !== undefined)
      .sort()
      .map((key) => [key, clean(value[key])]));
  }
  return value;
}

export function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}

export function sanitizeEndpointIdentity(endpointIdentity) {
  const raw = text(endpointIdentity?.url ?? endpointIdentity);
  if (!raw) return null;
  try {
    return new URL(raw).host || null;
  } catch {
    return null;
  }
}

function isLocal(executionClass) {
  return /^(?:local|local-native|lmstudio)(?:-|$)/.test(executionClass ?? '');
}

function toolDefinition(tool) {
  const definition = tool?.function && typeof tool.function === 'object' ? tool.function : tool;
  if (!definition || typeof definition !== 'object') return { name: text(definition) };
  return clean({
    name: definition.name,
    description: definition.description,
    parameters: definition.parameters ?? definition.inputSchema ?? definition.input_schema,
  });
}

export function toolSchemaDigest(tools = []) {
  const definitions = (Array.isArray(tools) ? tools : [tools])
    .map(toolDefinition)
    .sort((left, right) => canonicalize(left).localeCompare(canonicalize(right)));
  return sha256(definitions);
}

function requestedFields(requested, local) {
  const values = requested && typeof requested === 'object' ? requested : {};
  return Object.fromEntries(['quantization', 'modelFile', 'contextWindow', 'parallelSlots', 'loadConfig']
    .map((key) => [key, local ? field(values[key], values.source) : inapplicable()]));
}

function runtimeField(candidate, enrichment) {
  const runtime = enrichment.runtime ?? candidate.runtime;
  const name = runtime?.name ?? enrichment.runtimeName ?? candidate.runtimeName;
  const version = runtime?.version ?? enrichment.runtimeVersion ?? candidate.runtimeVersion;
  const verified = runtime?.instanceVerified === true || runtime?.provenanceBound === true
    || candidate.runtimeInstanceVerified === true || candidate.runtimeProvenanceBound === true;
  if (name === undefined && version === undefined) return { name: { state: 'missing' }, version: { state: 'missing' } };
  if (!verified) return { name: { state: 'unverified' }, version: { state: 'unverified' } };
  return {
    name: field(name, runtime?.source ?? enrichment.runtimeSource),
    version: field(version, runtime?.source ?? enrichment.runtimeSource),
  };
}

function reasoningField(candidate) {
  if (!own(candidate, 'reasoningMode') || candidate.reasoningMode === undefined) return { state: 'provider-default' };
  return field(candidate.reasoningMode, candidate.reasoningSource ?? 'candidate');
}

function fingerprintInput(profile) {
  const fingerprintField = (value) => value?.state === 'observed'
    ? { state: value.state, value: value.value }
    : { state: value?.state ?? 'missing' };
  const runtime = profile.actual.runtime;
  const runtimeObserved = runtime.name.state === 'observed' || runtime.version.state === 'observed';
  return {
    schemaVersion: profile.schemaVersion,
    executionClass: profile.executionClass,
    identity: profile.identity,
    actual: {
      quantization: fingerprintField(profile.actual.quantization),
      modelFile: fingerprintField(profile.actual.modelFile),
      contextWindow: fingerprintField(profile.actual.contextWindow),
      parallelSlots: fingerprintField(profile.actual.parallelSlots),
      loadConfig: fingerprintField(profile.actual.loadConfig),
      runtime: runtimeObserved
        ? { name: fingerprintField(runtime.name), version: fingerprintField(runtime.version) }
        : { name: { state: 'missing' }, version: { state: 'missing' } },
    },
    declared: {
      contextWindow: fingerprintField(profile.declared.contextWindow),
    },
    reasoningMode: fingerprintField(profile.reasoningMode),
    toolSchemaDigest: profile.toolSchemaDigest,
  };
}

export function fingerprintProfile(profile) {
  return sha256(fingerprintInput(profile));
}

export function deriveProfile(candidate = {}, enrichment = {}) {
  const executionClass = text(candidate.executionClass) ?? 'unknown';
  const local = isLocal(executionClass);
  const source = text(enrichment.source) ?? 'unspecified';
  const runtime = runtimeField(candidate, enrichment);
  const actual = local
    ? {
        quantization: field(enrichment.quantization, source),
        modelFile: field(enrichment.modelFile, source),
        // A route's declared context is not proof of its loaded instance config.
        contextWindow: field(enrichment.contextWindow, source),
        parallelSlots: field(enrichment.parallelSlots, source),
        loadConfig: field(enrichment.loadConfig, source),
        runtime,
      }
    : {
        quantization: inapplicable(),
        modelFile: inapplicable(),
        contextWindow: inapplicable(),
        parallelSlots: inapplicable(),
        loadConfig: inapplicable(),
        runtime,
      };
  const profile = {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    executionClass,
    identity: {
      provider: id(candidate.provider),
      model: id(candidate.model),
      endpointHost: sanitizeEndpointIdentity(candidate.endpointIdentity),
      adapterName: text(candidate.adapterName),
      adapterVersion: text(candidate.adapterVersion),
      ...(runtime.name.state === 'observed' ? { runtimeName: runtime.name.value } : {}),
      ...(runtime.version.state === 'observed' ? { runtimeVersion: runtime.version.value } : {}),
    },
    // Adapter/model metadata may describe a context limit. Keep it distinct
    // from a local loaded-instance observation and include it in the identity.
    declared: {
      contextWindow: field(candidate.contextWindow, 'candidate'),
    },
    actual,
    requested: requestedFields(enrichment.requested, local),
    reasoningMode: reasoningField(candidate),
    toolSchemaDigest: toolSchemaDigest(candidate.tools),
  };
  return { ...profile, fingerprint: fingerprintProfile(profile) };
}
