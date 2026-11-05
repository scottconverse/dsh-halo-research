import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const source = dirname(fileURLToPath(import.meta.url));
const stack = resolve(source, '..');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--output') throw new Error('node build.mjs --output <NEW bundle folder>');
const output = resolve(args[1]);
if (existsSync(output)) throw new Error('Output already exists; choose a new directory.');
const files = [
  ...["shared-knowledge/install.mjs", "stock-dsh/skills/knowledge-ingest/SKILL.md", "stock-dsh/skills/knowledge-query/SKILL.md", "stock-dsh/knowledge-library-template/README.md", "stock-dsh/knowledge-library-template/LIBRARY-RULES.md", "stock-dsh/knowledge-library-template/raw/.gitkeep", "stock-dsh/knowledge-library-template/wiki/index.md", "stock-dsh/knowledge-library-template/wiki/log.md", "stock-dsh/knowledge-library-template/wiki/sources/.gitkeep", "stock-dsh/knowledge-library-template/wiki/concepts/.gitkeep", "stock-dsh/knowledge-library-template/wiki/entities/.gitkeep", "stock-dsh/knowledge-library-template/wiki/synthesis/.gitkeep"].map(relative => ({from:join(stack,relative),path:`stack/${relative}`})),
  ...['install.mjs','start.mjs','profile.mjs','runtime-package.json','runtime-package-lock.json','README.md'].map(name => ({ from: join(source, name), path: name })),
  ...['index.mjs','core.mjs','no-progress-guard.mjs','project-fingerprint.mjs','package.json','skills/staff-engineer/SKILL.md','skills/triad-auditor/SKILL.md','skills/triad-coordinator/SKILL.md'].map(name => ({ from: join(stack, 'three-role',name), path: `stack/three-role/${name}` })),
  { from: join(stack,'stock-dsh','compaction-text-only.mjs'), path: 'stack/stock-dsh/compaction-text-only.mjs' },
];
// Resolve and hash every whitelisted input before creating the bundle. No
// profiles, credentials, runtime state, private receipts or node_modules copied.
const inventory = files.map(row => ({ ...row, sha256: createHash('sha256').update(readFileSync(row.from)).digest('hex') }));
mkdirSync(output, { recursive: true });
for (const row of inventory) { mkdirSync(dirname(join(output,row.path)), { recursive: true }); copyFileSync(row.from,join(output,row.path)); }
writeFileSync(join(output,'bundle.json'),JSON.stringify({ version:'0.1.1',runtimeVersion:'0.2.1-rc.5',files:inventory.map(({path,sha256}) => ({path,sha256})) },null,2));
console.log(`Built ${inventory.length} whitelisted files in ${output}. No installed state read or changed.`);
