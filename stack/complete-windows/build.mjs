import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, inside } from './files.mjs';
const source = path.dirname(fileURLToPath(import.meta.url));
const stack = path.resolve(source, '..');
export function build(output) {
  output = path.resolve(output);
  if (fs.existsSync(output)) throw Error('Bundle output already exists; choose a new directory');
  const components = JSON.parse(fs.readFileSync(path.join(source, 'components.json')));
  const entries = [];
  const add = (from, destination, transform) => {
    const content = transform ? Buffer.from(transform(fs.readFileSync(from, 'utf8'))) : fs.readFileSync(from);
    entries.push({content, path: destination, sha256: crypto.createHash('sha256').update(content).digest('hex')});
  };
  for (const name of ['Install-DSH.cmd', 'Install-DSH.ps1', 'Prepare-Redlib.ps1', 'Control-DSH.ps1', 'Shortcuts.ps1', 'Start-StockDSH.ps1', 'Expand-Component.ps1', 'xerj-mcp.mjs', 'components.json', 'runtime-package.json', 'runtime-package-lock.json', 'README.md']) add(path.join(source, name), name);
  for (const name of ['install.mjs', 'profile.mjs', 'files.mjs', 'halo-presets.mjs', 'web-runtime.mjs']) add(path.join(source, name), `stack/complete-windows/${name}`);
  for (const name of ['preset-sync.mjs', 'web-connection-guard.mjs', 'output-budget-patch.mjs', 'adapter-integrity-patch.mjs', 'ollama-timeout-fetch.mjs', 'web-fetch-evidence-patch.mjs', 'interrupted-command-recovery-patch.mjs']) {
    add(path.join(stack, 'stock-dsh', name), `stack/stock-dsh/${name}`);
  }
  add(path.join(stack, 'portable-cloud/profile.mjs'), 'stack/portable-cloud/profile.mjs');
  add(path.join(stack, 'neutral-workspace/prepare-overlay.mjs'), 'stack/neutral-workspace/prepare-overlay.mjs');
  for (const name of ['index.mjs', 'core.mjs', 'no-progress-guard.mjs', 'project-fingerprint.mjs', 'package.json', 'skills/staff-engineer/SKILL.md', 'skills/triad-auditor/SKILL.md', 'skills/triad-coordinator/SKILL.md']) add(path.join(stack, 'three-role', name), `stack/three-role/${name}`);
  for (const relative of ['stock-dsh/compaction-text-only.mjs', 'stock-dsh/mission-control/mission-control.mjs', 'stock-dsh/fast-first-preset/research-fallback.mjs', 'desktop-tuning/research-tool-hook.mjs']) add(path.join(stack, relative), `stack/${relative}`);
  for (const relative of ["shared-knowledge/install.mjs", "stock-dsh/skills/knowledge-ingest/SKILL.md", "stock-dsh/skills/knowledge-query/SKILL.md", "stock-dsh/knowledge-library-template/README.md", "stock-dsh/knowledge-library-template/LIBRARY-RULES.md", "stock-dsh/knowledge-library-template/raw/.gitkeep", "stock-dsh/knowledge-library-template/wiki/index.md", "stock-dsh/knowledge-library-template/wiki/log.md", "stock-dsh/knowledge-library-template/wiki/sources/.gitkeep", "stock-dsh/knowledge-library-template/wiki/concepts/.gitkeep", "stock-dsh/knowledge-library-template/wiki/entities/.gitkeep", "stock-dsh/knowledge-library-template/wiki/synthesis/.gitkeep"]) add(path.join(stack,relative), `stack/${relative}`);
  for (const name of ['index.mjs','client.js','dashboard.mjs','package.json','cordis.patch.yml']) {
    add(path.join(stack,'desktop-mission-control',name), `stack/desktop-mission-control/${name}`, name === 'client.js' ? source => source.replace("const ORIGIN = 'http://127.0.0.1:3091';", `const ORIGIN = 'http://127.0.0.1:${components.ports.desktopMissionControl}';`) : undefined);
  }
  const strataPorts = { 8081: components.ports.strataFull, 8082: components.ports.strataWorker, 8083: components.ports.strataCapped };
  for (const name of ['autostart.mjs', 'halo.py', 'worker.py', 'remote.py', 'windows_memory.py', 'prefetch_halo_experts.py', 'settings.py',
    'settings.example.json', 'halo-capped.example.json', 'worker-launch.example.json', 'delegation-policy.mjs']) {
    const rebased = ['autostart.mjs', 'halo.py', 'worker.py', 'settings.py'].includes(name)
      ? text => text.replace(/\b808[123]\b/g, port => String(strataPorts[port]))
        .replace("process.env.DSH_STRATA_CONFIG ?? new URL('settings.json', import.meta.url)", "new URL('settings.json', import.meta.url)")
        .replace("os.environ.get('DSH_STRATA_CONFIG', HERE / 'settings.json')", "HERE / 'settings.json'")
        .replace('source_port = 18181 if capped else ' + components.ports.strataFull, 'source_port = 18181 if capped else 8081')
      : undefined;
    add(path.join(stack, 'strata-paired', name), 'stack/strata-paired/' + name, rebased);
  }
  for (const name of ['browser.mjs', 'config.mjs', 'mcp.mjs', 'lead-route.mjs', 'package.json', 'package-lock.json']) {
    const transform = name === 'config.mjs' ? text => text
      .replace("join(process.env.LOCALAPPDATA, 'DSH-Halo-Browse')", "fileURLToPath(new URL('../../data/halo-browse', import.meta.url))")
      .replace('export const port = 19971;', 'export const port = ' + components.ports.browse + ';')
      : name === 'browser.mjs' ? text => text.replace("import { chromium } from 'playwright';",
        "process.env.PLAYWRIGHT_BROWSERS_PATH = fileURLToPath(new URL('../../tools/browse-chromium', import.meta.url));\nconst { chromium } = await import('playwright');")
        .replace("import { join } from 'node:path';", "import { join } from 'node:path';\nimport { fileURLToPath } from 'node:url';")
      : undefined;
    add(path.join(stack, 'halo-browse', name), 'stack/halo-browse/' + name, transform);
  }
  // Resolve/hash every explicit public input before creating anything. Never
  // recurse over a home, installation, cache, credential or private corpus.
  fs.mkdirSync(output, { recursive: true });
  for (const entry of entries) {
    const target = inside(output, entry.path); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, entry.content);
  }
  fs.writeFileSync(path.join(output, 'bundle.json'), JSON.stringify({ version: components.version, files: entries.map(({ path, sha256 }) => ({ path, sha256 })) }, null, 2));
  return { output, files: entries.length };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4 || process.argv[2] !== '--output') throw Error('node build.mjs --output <NEW folder>');
  console.log(JSON.stringify(build(process.argv[3])));
}
