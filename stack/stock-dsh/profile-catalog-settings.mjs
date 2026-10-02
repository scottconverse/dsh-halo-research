import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parseDocument, stringify } = createRequire(require.resolve('@deepseek-ai/dsh/package.json'))('yaml');
const [mode, path, legacyPath] = process.argv.slice(2);
const profile = parseDocument(readFileSync(path, 'utf8'));
if (profile.errors.length) throw new Error('Invalid Web profile YAML');
const rows = profile.toJSON();
const row = rows.findLast(row => row.id === 'llm-pi-ai');
if (!row) throw new Error('Missing Web provider catalog');
if (mode === 'read') {
  const selection = rows.findLast(row => row.id === 'agent-default-model')?.config;
  process.stdout.write(stringify({ 'llm-pi-ai': row.config,
    'subagent-model-selection': {}, 'agent-default-model': selection, 'agent-presets': {} }));
} else if (mode === 'write') {
  const legacy = parseDocument(readFileSync(legacyPath, 'utf8'));
  if (legacy.errors.length) throw new Error('Invalid replacement catalog');
  profile.setIn([rows.lastIndexOf(row), 'config'], legacy.get('llm-pi-ai').toJSON());
  writeFileSync(path, profile.toString());
} else throw new Error('Expected read or write');
