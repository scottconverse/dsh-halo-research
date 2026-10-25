// Shared service lifecycle only. XERJ itself owns MCP and retrieval.
const fs = require('node:fs');
const { spawn } = require('node:child_process');
// Pin the original physical store: MSIX AppData redirection differs by launch context.
const base='C:/Users/scott/AppData/Local/Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/XERJ';const exe='C:/Users/scott/AppData/Local/Programs/xerj/xerj.exe';
const args=['--insecure','--bind','127.0.0.1','--port','9200','--embed-mode','neural','--data-dir',base+'/data','--disable-feedback'];
async function healthy() {
  try {
    const r = await fetch('http://127.0.0.1:9200/_cluster/health', {
      signal: AbortSignal.timeout(1500),
    });
    if (!r.ok || (await r.json()).cluster_name !== 'xerj') return false;
  } catch { return false; }
  // A responding node can be serving a different Windows filesystem view.
  // Refuse adoption rather than silently accepting an empty store or starting a rival node.
  if (fs.existsSync(base + '/data/halo-records-docs/snapshot.json')) {
    const index = await fetch('http://127.0.0.1:9200/halo-records-docs', {
      signal: AbortSignal.timeout(1500),
    });
    if (!index.ok) throw Error('XERJ responds but cannot open the retained halo-records-docs index (HTTP ' + index.status + '). Verify and restart the shared node; do not reindex or start a competing server. Expected store: ' + base + '/data');
  }
  return true;
}

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    if (await healthy()) return;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw Error('XERJ neural service did not become ready; see ' + base + '/logs');
}

async function ensure() {
  if (await healthy()) return;
  fs.mkdirSync(base + '/logs', { recursive: true });
  const lockPath = base + '/startup.lock';
  let lock;
  try { lock = fs.openSync(lockPath, 'wx'); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    return waitReady(); // Another DSH instance is starting the shared node.
  }
  try {
    if (await healthy()) return;
    const out = fs.openSync(base + '/logs/server.stdout.log', 'a');
    const err = fs.openSync(base + '/logs/server.stderr.log', 'a');
    let child;
    try {
      child = spawn(exe, args, { cwd: base, windowsHide: true, detached: true,
        stdio: ['ignore', out, err] });
      await new Promise((resolve, reject) => {
        child.once('spawn', resolve);
        child.once('error', reject);
      });
    } finally { fs.closeSync(out); fs.closeSync(err); }
    fs.writeFileSync(base + '/server.pid', String(child.pid));
    child.unref();
    await waitReady();
  } finally { fs.closeSync(lock); fs.unlinkSync(lockPath); }
}

ensure().then(() => {
  if (process.argv.includes('--start-only')) {
    console.error('XERJ neural service ready at http://127.0.0.1:9200');
    return;
  }
  const child = spawn(exe, ['mcp', '--url', 'http://127.0.0.1:9200', '--disable-feedback'], {
    cwd: base, windowsHide: true, stdio: 'inherit',
    env: { ...process.env, XERJ_DISABLE_FEEDBACK: 'true' },
  });
  child.on('error', e => { console.error(e.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}).catch(e => { console.error(e.message); process.exitCode = 1; });
