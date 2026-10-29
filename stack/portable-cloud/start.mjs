import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { profile, MODEL } from './profile.mjs';
const root = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2];
if (mode && !['--dump-config','--help'].includes(mode)) throw new Error('Use node start.mjs [--dump-config|--help]');
if (mode === '--help') {
  console.log('node start.mjs: run this isolated cloud-only Web installation in the foreground. Ctrl+C stops it.\nnode start.mjs --dump-config: boot-free configuration inspection.\nRequires signed-in Ollama Cloud on localhost:11434. Does not start Ollama or open a browser.');
  process.exit(0);
}
const portable = JSON.parse(readFileSync(join(root, 'portable.json')));
const port = portable.port;
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('portable.json port must be 1..65535');
if (!mode) {
  await new Promise((res, rej) => { const s = createServer(); s.once('error', () => rej(new Error(`Port ${port} is already in use; no service stopped or reused. Change portable.json while this installation is stopped.`))); s.listen(port, '127.0.0.1', () => s.close(res)); });
  let info;
  try {
    const r = await fetch('http://127.0.0.1:11434/api/show', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: MODEL }), signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    info = await r.json();
  } catch (e) { throw new Error(`Ollama cloud model unavailable. Install Ollama, sign in and register ${MODEL} in your own account. No local weights are required. ${e.message}`); }
  if (!info.remote_host || !info.remote_model) throw new Error('Ollama did not identify this as a cloud model; refusing local inference fallback.');
}
const dir = join(root, 'home', 'profiles', 'cloud');
mkdirSync(dir, { recursive: true });
// Preserve native editor changes. On relocation, rewrite only this bundle's
// previous root prefix, plus its managed loopback port; never reset defaults.
const patch = join(dir, 'cordis.patch.yml');
if (!existsSync(patch)) writeFileSync(patch, JSON.stringify(profile(root, port), null, 2));
else {
  const require = createRequire(join(root,'node_modules','@deepseek-ai','dsh','package.json'));
  const yaml = require('js-yaml');
  const rows = yaml.load(readFileSync(patch,'utf8'));
  const before = portable.rootAtLastLaunch;
  function relocate(value) {
    if (typeof value === 'string' && before) {
      const uri = pathToFileURL(before).href;
      if (value === before || value.startsWith(before + '/') || value.startsWith(before + '\\')) return root + value.slice(before.length);
      if (value === uri || value.startsWith(uri + '/')) return pathToFileURL(root).href + value.slice(uri.length);
    }
    if (Array.isArray(value)) return value.map(relocate);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,relocate(v)]));
    return value;
  }
  const rebound = relocate(rows);
  const web = rebound.find(row=>row.id === 'webserver');
  if (!web) throw new Error('Managed webserver row missing; profile was not rewritten.');
  if (before !== root || web.config?.port !== port) {
    web.config = { ...web.config, host:'127.0.0.1', port };
    writeFileSync(patch,JSON.stringify(rebound,null,2));
  }
}
if (portable.rootAtLastLaunch !== root) writeFileSync(join(root,'portable.json'),JSON.stringify({...portable,rootAtLastLaunch:root},null,2));
const child = spawn(process.execPath, [join(root, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'), '--profile', 'cloud', ...(mode ? [mode] : ['--no-open'])], {
  cwd: root, stdio: 'inherit', env: { ...process.env, DSH_HOME: join(root, 'home'), DSH_TELEMETRY_DISABLED: '1', DSH_OLLAMA_LOCAL_TOKEN: 'ollama' },
});
child.on('error', e => { console.error(e.message); process.exitCode = 1; });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
