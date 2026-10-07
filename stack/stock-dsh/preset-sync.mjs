#!/usr/bin/env node
// Halo DSH preset recovery mirror generator/checker.
//
// Active DSH 0.2 Web preset composition is authoritative in the embedded
// `plugins` array inside web-profile/cordis.patch.yml. The external
// `<preset-id>-preset/agent.cordis.yml` files on disk are recovery mirrors of
// that composition. This helper derives the mirrors from the embedded source
// and fails a check when they drift, so there is exactly one editable
// authority: the embedded profile.
//
//   node preset-sync.mjs check   # nonzero exit on drift, no writes
//   node preset-sync.mjs sync    # rewrite external mirrors from embedded source
//
// Importing this module performs no filesystem mutation.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const stockRequire = createRequire(require.resolve('@deepseek-ai/dsh/package.json'));
const { parseDocument, stringify } = stockRequire('yaml');
const { entryListProblem } = stockRequire('@deepseek-ai/dsh-agent-preset-registry');
const Schema = stockRequire('@deepseek-ai/schemastery');
const AgentPresetPlugin = stockRequire('@deepseek-ai/dsh-agent-preset').default;

export const PROFILE_PATH = path.join(here, 'web-profile', 'cordis.patch.yml');
export const BEGIN_MARKER = '# BEGIN Halo 0.2 registered presets';
export const END_MARKER = '# END Halo 0.2 registered presets';
export const GENERATED_HEADER = [
  '# GENERATED FILE - DO NOT EDIT.',
  '# Source: web-profile/cordis.patch.yml (embedded registered preset).',
  '# Run: node preset-sync.mjs sync',
].join('\n');

// The registered Web preset id determines the external recovery folder. Any
// other external agent.cordis.yml preset folder is discovered from the
// registered presets themselves, so newly registered presets are covered
// without editing this list.
const EXTERNAL_DIR_SUFFIX = '-preset';

const STRINGIFY_OPTIONS = { lineWidth: 0, indent: 2, minContentWidth: 0 };

function profileText(profilePath = PROFILE_PATH) {
  return fs.readFileSync(profilePath, 'utf8');
}

function docForProfile(profilePath = PROFILE_PATH) {
  const text = profileText(profilePath);
  const doc = parseDocument(text);
  if (doc.errors.length > 0) {
    throw new Error(`${profilePath} is not valid YAML: ${doc.errors[0].message}`);
  }
  return doc;
}

function isMapNode(node) {
  return node && typeof node.get === 'function';
}

function childMap(node, key) {
  const child = node.get(key);
  return isMapNode(child) ? child : null;
}

function scalarString(node, key) {
  const value = node ? node.get(key) : undefined;
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value && typeof value.value === 'string') return value.value;
  return null;
}

// Locate the registered preset insert row. Prefer the marker comments when
// present; fall back to an `insert` row whose entries declare preset configs.
function registeredInsertRow(doc) {
  const root = doc.contents;
  if (!root || !Array.isArray(root.items)) {
    throw new Error('web profile must contain a top-level YAML sequence');
  }
  const markerIndex = markerInsertIndex(root);
  if (markerIndex != null) return root.items[markerIndex];

  for (const row of root.items) {
    const insert = childMap(row, 'insert');
    if (!insert || !Array.isArray(insert.items)) continue;
    if (insert.items.some((item) => presetFromEntry(item))) return row;
  }
  throw new Error('could not find the registered preset insert row in web profile');
}

function markerInsertIndex(root) {
  let seenBegin = false;
  let candidate = null;
  for (const row of root.items) {
    const commentsBefore = row && row.commentBefore ? String(row.commentBefore) : '';
    const comments = row && row.comment ? String(row.comment) : '';
    const text = `${commentsBefore}\n${comments}`;
    if (text.includes(BEGIN_MARKER)) {
      seenBegin = true;
      candidate = row;
      continue;
    }
    if (text.includes(END_MARKER)) break;
  }
  return candidate ? root.items.indexOf(candidate) : null;
}

// Extract one AgentPreset config from a registered preset row. Returns null
// when the row is not an agent-preset registration.
export function presetFromEntry(entry) {
  if (!isMapNode(entry)) return null;
  const hostId = scalarString(entry, 'id');
  const name = scalarString(entry, 'name');
  if (name !== '@deepseek-ai/dsh-agent-preset') return null;
  const config = childMap(entry, 'config');
  if (!config) throw new Error('Registered preset must have a config map');
  Schema.resolve(config.toJSON(), AgentPresetPlugin.Config, {});
  const plugins = config.get('plugins');
  if (!plugins || !Array.isArray(plugins.items)) throw new Error('Registered preset plugins must be a sequence');
  const presetId = scalarString(config, 'id');
  if (!presetId) throw new Error('Registered preset must have a nonempty id');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(presetId))
    throw new Error('Preset id must be a safe directory name: ' + presetId);
  return {
    definition: config,
    hostId,
    presetId,
    name: scalarString(config, 'name') ?? presetId,
    description: scalarString(config, 'description') ?? '',
    order: config.get('order')?.value ?? null,
    plugins,
  };
}

// Read every embedded registered preset from web-profile/cordis.patch.yml.
// Returns plain descriptors that point at live YAML nodes (no toJS conversion,
// so `!!js` tags and comments survive rendering).
export function readEmbeddedPresets(profilePath = PROFILE_PATH) {
  const doc = docForProfile(profilePath);
  const row = registeredInsertRow(doc);
  const insert = childMap(row, 'insert');
  const presets = [];
  for (const entry of insert.items) {
    const preset = presetFromEntry(entry);
    if (preset) presets.push(preset);
  }
  if (presets.length === 0) throw new Error('no registered presets found in web profile');
  if (new Set(presets.map(preset => preset.presetId)).size !== presets.length)
    throw new Error('Duplicate registered preset id');
  return { doc, presets };
}

export function externalPathForPreset(preset) {
  return path.join(here, `${preset.presetId}${EXTERNAL_DIR_SUFFIX}`, 'agent.cordis.yml');
}

// Rewrite embedded absolute preset-folder module paths to a relative path from
// the external mirror folder. Only the canonical preset-folder prefix is
// rewritten; all other absolute paths are left untouched.
function relativeModuleName(name, presetId) {
  const prefixes = [
    `file:///C:/Users/scott/.dsh-stock/.agent-presets/${presetId}/`,
    `file:///c:/Users/scott/.dsh-stock/.agent-presets/${presetId}/`,
  ];
  const prefix = prefixes.find((candidate) => name.startsWith(candidate));
  if (!prefix) return name;
  const tail = name.slice(prefix.length).replace(/\\/g, '/');
  return tail.startsWith('./') ? tail : `./${tail}`;
}

const MODULE_PATH_KEYS = ['name', 'path'];

// Return a deep clone of the plugin sequence with preset-local module paths
// rewritten for the external mirror location. YAML nodes are deep-cloned so
// the authoritative embedded document is never mutated.
export function renderPluginSequence(preset) {
  const clone = preset.plugins.clone();
  rewriteModulePaths(clone, preset.presetId);
  return clone;
}

function rewriteModulePaths(node, presetId) {
  if (!node || typeof node !== 'object') return;
  if (node.constructor && node.constructor.name === 'Pair') {
    const key = node.key && node.key.value;
    if (
      MODULE_PATH_KEYS.includes(key) &&
      node.value &&
      typeof node.value.value === 'string'
    ) {
      const rewritten = relativeModuleName(node.value.value, presetId);
      if (rewritten !== node.value.value) node.value.value = rewritten;
    }
    rewriteModulePaths(node.value, presetId);
    return;
  }
  if (Array.isArray(node.items)) {
    for (const item of node.items) rewriteModulePaths(item, presetId);
    return;
  }
  if (node.constructor && node.constructor.name === 'YAMLMap') {
    for (const pair of node.items) rewriteModulePaths(pair, presetId);
  }
}

function validatePreset(preset) {
  Schema.resolve(preset.definition.toJSON(), AgentPresetPlugin.Config, {});
  const problem = entryListProblem(preset.plugins.toJSON());
  if (problem) {
    throw new Error(`embedded preset ${preset.presetId} is invalid: ${problem}`);
  }
}

export function renderExternal(preset) {
  validatePreset(preset);
  const sequence = renderPluginSequence(preset);
  const body = stringify(sequence, STRINGIFY_OPTIONS);
  return normalizeNewlines(`${GENERATED_HEADER}\n${body.endsWith('\n') ? body : `${body}\n`}`);
}

function normalizeNewlines(text) {
  return String(text).replace(/\r\n/g, '\n');
}

function stripGeneratedHeader(text) {
  return normalizeNewlines(text).replace(
    /^# GENERATED FILE - DO NOT EDIT\.\n(?:# .*\n)*/,
    '',
  );
}

export function checkPresets({ profilePath = PROFILE_PATH, fsApi = fs } = {}) {
  const { presets } = readEmbeddedPresets(profilePath);
  const results = [];
  for (const preset of presets) {
    const expected = renderExternal(preset);
    const target = externalPathForPreset(preset);
    let actual = null;
    let exists = true;
    try {
      actual = fsApi.readFileSync(target, 'utf8');
    } catch (error) {
      if (error && error.code === 'ENOENT') exists = false;
      else throw error;
    }
    const drift = !exists || normalizeNewlines(actual) !== normalizeNewlines(expected);
    results.push({
      presetId: preset.presetId,
      hostId: preset.hostId,
      path: target,
      exists,
      drift,
      expected: normalizeNewlines(expected),
      actual: actual == null ? null : normalizeNewlines(actual),
    });
  }
  return results;
}

export function syncPresets({ profilePath = PROFILE_PATH, fsApi = fs } = {}) {
  const { presets } = readEmbeddedPresets(profilePath);
  // Validate every definition before the first mirror write.
  const plan = presets.map(preset => ({ preset, expected: normalizeNewlines(renderExternal(preset)), target: externalPathForPreset(preset) }));
  const results = [];
  for (const { preset, expected, target } of plan) {
    let changed = true;
    try {
      const actual = normalizeNewlines(fsApi.readFileSync(target, 'utf8'));
      changed = actual !== expected;
    } catch (error) {
      if (!error || error.code !== 'ENOENT') throw error;
    }
    if (changed) {
      fsApi.mkdirSync(path.dirname(target), { recursive: true });
      fsApi.writeFileSync(target, expected, 'utf8');
    }
    results.push({ presetId: preset.presetId, hostId: preset.hostId, path: target, changed });
  }
  return results;
}

export function mapPresets(presets = readEmbeddedPresets().presets) {
  return presets.map((preset) => ({
    presetId: preset.presetId,
    hostId: preset.hostId,
    source: PROFILE_PATH,
    external: externalPathForPreset(preset),
  }));
}

export function formatCheckReport(results, { cwd = process.cwd() } = {}) {
  const drifting = results.filter((result) => result.drift);
  if (drifting.length === 0) {
    return `preset-sync: OK (${results.length} external mirrors in sync)\n`;
  }
  const lines = [`preset-sync: ${drifting.length} of ${results.length} external mirrors drifted`];
  for (const result of drifting) {
    const shown = path.relative(cwd, result.path) || result.path;
    lines.push(`  - ${result.presetId}: ${shown}${result.exists ? '' : ' (missing)'}`);
  }
  lines.push('Run: node preset-sync.mjs sync');
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const command = argv[2];
  if (command !== 'check' && command !== 'sync') {
    return { command: null, error: `unknown command: ${command ?? '(none)'}` };
  }
  return { command, error: null };
}

function isMain() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href;
  } catch {
    return false;
  }
}

if (isMain()) {
  const { command, error } = parseArgs(process.argv);
  if (error) {
    process.stderr.write(`${error}\nUsage: node preset-sync.mjs <check|sync>\n`);
    process.exitCode = 2;
  } else if (command === 'check') {
    const results = checkPresets();
    process.stdout.write(formatCheckReport(results));
    if (results.some((result) => result.drift)) process.exitCode = 1;
  } else if (command === 'sync') {
    const results = syncPresets();
    const changed = results.filter((result) => result.changed);
    process.stdout.write(
      changed.length === 0
        ? `preset-sync: OK (${results.length} external mirrors already in sync)\n`
        : `preset-sync: wrote ${changed.length} of ${results.length} external mirrors\n`,
    );
  }
}

export { stripGeneratedHeader };
