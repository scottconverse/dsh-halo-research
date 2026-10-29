import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const source = dirname(fileURLToPath(import.meta.url));
export function install(dest, port = 3080) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24 or newer is required.');
  if (!dest) throw new Error('Supply a NEW destination: node install.mjs --dest <folder> [--port 3080]');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be 1..65535');
  const target = resolve(dest);
  if (existsSync(target)) throw new Error('Destination already exists; no files changed. Choose a new folder.');
  const inventory = JSON.parse(readFileSync(join(source, 'bundle.json')));
  for (const row of inventory.files) {
    if (isAbsolute(row.path) || row.path.split(/[\\/]/).includes('..')) throw new Error('Unsafe bundle path');
    const actual = createHash('sha256').update(readFileSync(join(source, row.path))).digest('hex');
    if (actual !== row.sha256) throw new Error(`Bundle integrity mismatch: ${row.path}`);
  }
  mkdirSync(target, { recursive: true });
  const targetReal = realpathSync(target);
  const copy = (from, to) => { const path = join(targetReal, to); const rel = relative(targetReal, path); if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Target outside destination'); mkdirSync(dirname(path), { recursive: true }); copyFileSync(join(source, from), path); };
  for (const row of inventory.files) if (row.path !== 'install.mjs' && !row.path.startsWith('runtime-')) copy(row.path, row.path);
  copy('runtime-package.json', 'package.json');
  copy('runtime-package-lock.json', 'package-lock.json');
  const home = join(targetReal, 'home');
  mkdirSync(join(home, 'profiles', 'cloud'), { recursive: true });
  writeFileSync(join(home, 'profiles', 'cloud', 'package.json'), JSON.stringify({ name: 'dsh-profile-cloud', private: true, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app'], patchReload: 'never' } } }, null, 2));
  writeFileSync(join(targetReal, 'portable.json'), JSON.stringify({ port }, null, 2));
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  // npm's shipped JS entry avoids cmd.exe quoting of user-controlled paths.
  const probe = process.env.npm_execpath;
  let npmEntry = probe && existsSync(probe) ? probe : join(dirname(process.execPath), 'node_modules','npm','bin','npm-cli.js');
  let result;
  if (existsSync(npmEntry)) result = spawnSync(process.execPath, [npmEntry,'ci','--omit=dev','--no-audit','--no-fund'], { cwd: targetReal, stdio: 'inherit' });
  else if (process.platform !== 'win32') result = spawnSync(npm, ['ci','--omit=dev','--no-audit','--no-fund'], { cwd: targetReal, stdio: 'inherit' });
  else throw new Error('npm CLI was not found beside Node. Install a standard Node.js distribution. Partial destination retained; no existing installation changed.');
  const receipt = { status: result.status === 0 ? 'installed' : 'dependency-install-incomplete', root: targetReal, node: process.version, runtimeVersion: '0.2.1-rc.3', bundle: inventory.version, installedAt: new Date().toISOString(), existingInstallationsModified: false, modelCalls: 0 };
  writeFileSync(join(targetReal, 'INSTALL-RECEIPT.json'), JSON.stringify(receipt, null, 2));
  if (result.status !== 0) throw new Error('Dependency installation failed; partial folder retained for diagnosis. No retry or existing-profile update performed.');
  console.log(`Installed isolated cloud DSH in ${targetReal}\nStart: node "${join(targetReal,'start.mjs')}"\nNo service, browser or model was started. Ollama sign-in is performed separately by you.`);
  return receipt;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2); let dest, port = 3080;
    if (args.includes('--help')) { console.log('node install.mjs --dest <NEW folder> [--port 3080]\nNode.js24+ and npm required. Downloads pinned DSH dependencies; never modifies an existing installation.'); process.exit(0); }
    for (let i=0;i<args.length;i++) { if (args[i] === '--dest') dest=args[++i]; else if (args[i] === '--port') port=Number(args[++i]); else throw new Error(`Unknown option ${args[i]}`); }
    install(dest, port);
  } catch (e) { console.error(e.message); process.exitCode=1; }
}
