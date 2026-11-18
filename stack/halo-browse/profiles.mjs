import assert from 'node:assert/strict';
import { copyFileSync, constants, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

const surfaces = ['web', 'desktop'];
const paired = ['local-5070', 'local-5070-capped'];
const parsePatch = bytes => parse(bytes.toString(), {
  customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: input => input }],
});

function insertRows(list) {
  return list.flatMap(row => row.insert ?? []);
}

function overlay(source, node) {
  const original = parsePatch(source);
  const inserts = insertRows(original);
  const variants = [];
  const client = {
    id: 'mcp-halo-browse',
    name: '@deepseek-ai/dsh-mcp-client',
    config: {
      serverName: 'halo_browse',
      transport: 'stdio',
      command: node,
      args: [fileURLToPath(new URL('mcp.mjs', import.meta.url))],
      toolCallTimeoutMs: 60000,
      failOnStartupError: false,
    },
  };
  const hook = { id: 'halo-browse-lead-route', name: new URL('lead-route.mjs', import.meta.url).href };
  assert(inserts.some(row => row.id === 'halo-preset-local-lean') && inserts.some(row => row.id === 'halo-strata-auto-start'));
  assert(inserts.every(row => !row.id?.endsWith('-browse')));
  const lf = source.toString().replaceAll('\r\n', '\n');
  for (const id of paired) {
    const key = 'halo-preset-' + id;
    const originalPreset = inserts.find(row => row.id === key);
    assert(originalPreset && originalPreset.config.id === id);
    const workers = originalPreset.config.plugins.filter(row => row.name === '@deepseek-ai/dsh-tool-subagent');
    assert.equal(workers.length, 1);
    assert.equal(workers[0].config.provider, 'spawn');
    assert.equal(workers[0].config.agentPreset, 'local-lean');
    assert.equal(workers[0].config.agentOptions.provider, 'strata-5070ti');
    assert.equal(workers[0].config.maxDepth, 1);
    const lines = lf.split('\n');
    const start = lines.indexOf('    - id: ' + key);
    const end = lines.findIndex((line, index) => index > start && /^    - id: |^- /.test(line));
    assert(start >= 0 && end > start);
    const raw = lines.slice(start, end).join('\n').trimEnd();
    const renderedClient = stringify([client], { lineWidth: 0 }).trimEnd().split('\n')
      .map(line => '          ' + line).join('\n');
    const clone = raw.replace('    - id: ' + key, '    - id: ' + key + '-browse')
      .replace(/^        id: (.+)$/m, '$&-browse')
      .replace(/^        name: (.+)$/m, '$& + Browse')
      .replace(/^        plugins:$/m, '$&\n' + renderedClient);
    const [rendered] = parsePatch('- insert:\n' + clone + '\n')[0].insert;
    const expected = structuredClone(originalPreset);
    expected.id += '-browse';
    expected.config.id += '-browse';
    expected.config.name += ' + Browse';
    expected.config.plugins.unshift(client);
    assert.deepEqual(rendered, expected);
    variants.push(clone);
  }
  const nl = source.includes(Buffer.from('\r\n')) ? '\r\n' : '\n';
  const hookYAML = stringify([{ insert: [hook] }], { lineWidth: 0 }).trimEnd();
  const suffix = '\n\n- insert:\n' + variants.join('\n') + '\n\n' + hookYAML + '\n';
  const result = Buffer.concat([source, Buffer.from(suffix.replaceAll('\n', nl))]);
  const check = parsePatch(result);
  assert.deepEqual(check.slice(0, -2), original);
  return result;
}

const [action, web, desktop, records, node = process.execPath] = process.argv.slice(2);
assert(['stage', 'install', 'rollback'].includes(action) && web && desktop && records,
  'Usage: node profiles.mjs stage|install|rollback WEB DESKTOP RECORDS [NODE_EXE]');
const targets = [resolve(web), resolve(desktop)];
assert.notEqual(targets[0].toLowerCase(), targets[1].toLowerCase());
const entries = surfaces.map((surface, index) => ({
  file: targets[index],
  original: join(records, surface + '.original.yml'),
  candidate: join(records, surface + '.browse.yml'),
}));

function swap(entry, from) {
  const tmp = entry.file + '.browse-' + process.pid + '.tmp';
  copyFileSync(entry[from], tmp, constants.COPYFILE_EXCL);
  try { renameSync(tmp, entry.file); } finally { rmSync(tmp, { force: true }); }
}

if (action === 'stage') {
  const staged = entries.map(entry => {
    const before = readFileSync(entry.file);
    return { entry, before, after: overlay(before, node) };
  });
  mkdirSync(records);
  for (const { entry, before, after } of staged) {
    writeFileSync(entry.original, before, { flag: 'wx' });
    writeFileSync(entry.candidate, after, { flag: 'wx' });
  }
} else {
  const from = action === 'install' ? 'candidate' : 'original';
  const expected = action === 'install' ? 'original' : 'candidate';
  for (const entry of entries) {
    assert(readFileSync(entry.file).equals(readFileSync(entry[expected])), 'Profile changed since staging: ' + entry.file);
  }
  const applied = [];
  try {
    for (const entry of entries) {
      swap(entry, from);
      applied.push(entry);
    }
  } catch (error) {
    for (const entry of applied.reverse()) swap(entry, expected);
    throw error;
  }
}
console.log(action + ': Web and Desktop Browse overlay verified');
