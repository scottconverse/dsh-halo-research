import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, inside } from './files.mjs';
const source = path.dirname(fileURLToPath(import.meta.url));
const stack = path.resolve(source, '..');
export function build(output) {
  output = path.resolve(output);
  if (fs.existsSync(output)) throw Error('Bundle output already exists; choose a new directory');
  const entries = [];
  const add = (from, destination) => entries.push({ from, path: destination, sha256: digest(from) });
  for (const name of ['Install-DSH.cmd', 'Install-DSH.ps1', 'Prepare-Redlib.ps1', 'Control-DSH.ps1', 'Shortcuts.ps1', 'Start-StockDSH.ps1', 'Expand-Component.ps1', 'xerj-mcp.mjs', 'components.json', 'runtime-package.json', 'runtime-package-lock.json', 'README.md']) add(path.join(source, name), name);
  for (const name of ['install.mjs', 'profile.mjs', 'files.mjs']) add(path.join(source, name), `stack/complete-windows/${name}`);
  add(path.join(stack, 'portable-cloud/profile.mjs'), 'stack/portable-cloud/profile.mjs');
  for (const name of ['index.mjs', 'core.mjs', 'no-progress-guard.mjs', 'project-fingerprint.mjs', 'package.json', 'skills/staff-engineer/SKILL.md', 'skills/triad-auditor/SKILL.md', 'skills/triad-coordinator/SKILL.md']) add(path.join(stack, 'three-role', name), `stack/three-role/${name}`);
  for (const relative of ['stock-dsh/compaction-text-only.mjs', 'stock-dsh/mission-control/mission-control.mjs', 'stock-dsh/fast-first-preset/research-fallback.mjs', 'desktop-tuning/research-tool-hook.mjs']) add(path.join(stack, relative), `stack/${relative}`);
  // Resolve/hash every explicit public input before creating anything. Never
  // recurse over a home, installation, cache, credential or private corpus.
  fs.mkdirSync(output, { recursive: true });
  for (const entry of entries) {
    const target = inside(output, entry.path); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(entry.from, target);
  }
  fs.writeFileSync(path.join(output, 'bundle.json'), JSON.stringify({ version: '0.1.0', files: entries.map(({ path, sha256 }) => ({ path, sha256 })) }, null, 2));
  return { output, files: entries.length };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4 || process.argv[2] !== '--output') throw Error('node build.mjs --output <NEW folder>');
  console.log(JSON.stringify(build(process.argv[3])));
}
