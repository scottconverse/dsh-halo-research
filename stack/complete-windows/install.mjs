import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { initializeKnowledge } from '../shared-knowledge/install.mjs';
import { atomicJson, download, inside, verifyBundle, digest } from './files.mjs';
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function run(exe, args, root, env = process.env) {
  const result = spawnSync(exe, args, { cwd: root, env, stdio: 'inherit', windowsHide: true, shell: false });
  if (result.error || result.status !== 0) throw Error(`${path.basename(exe)} did not complete: ${result.error?.message || result.status}`);
}
function findFile(root, name) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === name.toLowerCase()) return full;
    if (entry.isDirectory()) { const match = findFile(full, name); if (match) return match; }
  }
}
// Official installers can carry a direct payload or an NSIS inner 7z archive.
// Extract only into the new install root; never execute the installer/updater.
export function extractDesktop(archive, target, extract) {
  extract(archive, target);
  let exe = findFile(target, 'DeepSeek Harness.exe');
  if (!exe) {
    const inner = findFile(target, 'app-64.7z');
    if (inner) { extract(inner, path.join(target, 'application')); exe = findFile(path.join(target, 'application'), 'DeepSeek Harness.exe'); }
  }
  if (!exe) throw Error('Desktop executable missing after extraction');
  return exe;
}
export async function install(root) {
  if (process.platform !== 'win32') throw Error('Windows x64 required');
  root = path.resolve(root);
  const owner = JSON.parse(fs.readFileSync(path.join(root, '.dsh-complete-owner.json'), 'utf8').replace(/^\uFEFF/, ''));
  if (owner.kind !== 'dsh-complete-v1' || owner.root !== root) throw Error('Use Install-DSH.ps1 with a new destination');
  const bundle = verifyBundle(source);
  const components = JSON.parse(fs.readFileSync(path.join(source, 'components.json')));
  const receiptFile = path.join(root, 'INSTALL-RECEIPT.json');
  const receipt = fs.existsSync(receiptFile) ? JSON.parse(fs.readFileSync(receiptFile)) : { version: components.version, startedAt: new Date().toISOString(), steps: {}, modelCalls: 0, existingDshProfilesModified: false };
  const bundleHash = digest(path.join(source, 'bundle.json'));
  if (receipt.bundleHash && receipt.bundleHash !== bundleHash) throw Error('Resume candidate differs from the original bundle; use a new destination');
  receipt.bundleHash = bundleHash;
  const checkpoint = async (name, operation) => {
    if (receipt.steps[name]?.status === 'complete') return;
    receipt.status = 'installing'; receipt.currentStep = name; atomicJson(receiptFile, receipt);
    const result = await operation();
    receipt.steps[name] = { status: 'complete', at: new Date().toISOString(), ...result }; atomicJson(receiptFile, receipt);
  };
  try {
    await checkpoint('files', async () => {
      for (const row of bundle.files) {
        const target = inside(root, row.path); fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(inside(source, row.path), target);
      }
      fs.copyFileSync(path.join(root, 'runtime-package.json'), path.join(root, 'package.json'));
      fs.copyFileSync(path.join(root, 'runtime-package-lock.json'), path.join(root, 'package-lock.json'));
    });
    const node = path.join(root, 'tools/node/node.exe');
    const env = { ...process.env, npm_config_cache: path.join(root, 'cache/npm'), PLAYWRIGHT_BROWSERS_PATH: path.join(root, 'tools/browsers'), PATH: [path.dirname(node), path.join(root, 'node_modules/.bin'), process.env.PATH].join(path.delimiter) };
    const powershell = process.env.DSH_COMPLETE_PWSH;
    if (!powershell || !fs.existsSync(powershell)) throw Error('Use Install-DSH.cmd or Install-DSH.ps1 from PowerShell 7');
    // Provision the existing native builder before npm's native addons. A
    // pristine Windows machine may need C++/Python; do not rely on Halo's tools.
    await checkpoint('reddit', async () => {
      const archive = path.join(root, 'downloads/reddit.zip');
      await download(archive, components.reddit);
      const target = path.join(root, 'tools/reddit');
      run(powershell, ['-NoLogo', '-NoProfile', '-File', path.join(root, 'Expand-Component.ps1'), '-Archive', archive, '-Destination', target], root, env);
      return { sha256: digest(archive), url: components.reddit.url };
    });
    await checkpoint('redlib-build', async () => {
      run(powershell, ['-NoLogo', '-NoProfile', '-File', path.join(root, 'Prepare-Redlib.ps1'), '-PackageRoot', path.join(root, 'tools/reddit'), '-InstallRoot', path.join(root, 'tools/redlib'), '-Port', String(components.ports.redlib)], root, env);
      const binary = findFile(path.join(root, 'tools/redlib/versions'), 'redlib.exe');
      if (!binary) throw Error('Redlib build produced no executable');
      atomicJson(path.join(root, 'redlib.json'), { exe: path.relative(root, binary), sha256: digest(binary) });
    });
    env.npm_config_python = JSON.parse(fs.readFileSync(path.join(root, 'data/reddit-config.json'))).python;
    await checkpoint('npm', async () => run(node, [path.join(root, 'tools/node/node_modules/npm/bin/npm-cli.js'), 'ci', '--omit=dev', '--no-audit', '--no-fund'], root, env));
    const require = createRequire(path.join(root, 'package.json'));
    const seven = require('7zip-bin').path7za;
    const extract = (archive, directory) => {
      fs.mkdirSync(directory, { recursive: true });
      run(seven, ['x', archive, `-o${directory}`, '-y'], root, env);
    };
    for (const name of ['desktop', 'ollama', 'xerj']) {
      await checkpoint(name, async () => {
        const archive = path.join(root, 'downloads', name + (name === 'desktop' ? '.exe' : '.zip'));
        await download(archive, components[name]);
        const target = path.join(root, 'tools', name);
        if (name === 'desktop') {
          const exe = extractDesktop(archive, target, extract);
          // Extract only: never execute NSIS, register protocols, replace a live app,
          // or install the upstream updater/uninstaller into the current profile.
          atomicJson(path.join(root, 'desktop.json'), { exe: path.relative(root, exe), sha256: digest(exe) });
        } else {
          extract(archive, target);
          if (name === 'xerj') {
            const binary = findFile(target, 'xerj.exe'); if (!binary) throw Error('XERJ executable missing');
            if (binary !== path.join(target, 'xerj.exe')) fs.copyFileSync(binary, path.join(target, 'xerj.exe'));
          }
        }
        return { url: components[name].url, sha256: digest(archive) };
      });
    }
    await checkpoint('knowledge-library', async () => initializeKnowledge(root));
    await checkpoint('profiles', async () => {
      const { profile } = await import('./profile.mjs');
      const yaml = require('yaml');
      for (const host of ['web', 'desktop']) {
        const document = yaml.stringify(profile(root, components, host));
        const directory = path.join(root, 'home/profiles', host); fs.mkdirSync(directory, { recursive: true });
        const patch = path.join(directory, 'cordis.patch.yml');
        if (fs.existsSync(patch)) {
          if (fs.readFileSync(patch, 'utf8') !== document) throw Error('Refusing to replace an edited profile');
        } else fs.writeFileSync(patch, document);
        atomicJson(path.join(directory, 'package.json'), { name: `dsh-profile-${host}`, private: true, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'], patchReload: 'never' } } });
      }
      for (const host of ['web','desktop']) {
        fs.mkdirSync(path.join(root, `${host}-profile`), {recursive: true});
        fs.writeFileSync(path.join(root, `${host}-profile/cordis.patch.yml`), yaml.stringify(profile(root, components, host)));
      }
      atomicJson(path.join(root, 'complete.json'), { version: components.version, ports: components.ports, selectedModels: [], firstRun: true });
    });
    await checkpoint('browser', async () => run(node, [path.join(root, 'node_modules/playwright/cli.js'), 'install', 'chromium'], root, env));
    await checkpoint('shortcuts', async () => run(powershell, ['-NoLogo', '-NoProfile', '-File', path.join(root, 'Shortcuts.ps1')], root, env));
    receipt.status = 'installed-awaiting-account-sign-in-and-model-selection'; delete receipt.currentStep; atomicJson(receiptFile, receipt);
    console.log(`Installed in ${root}. Read README.md, then use this installation's shortcuts. No model was pulled or invoked. Accounts are signed in separately.`);
    return receipt;
  } catch (error) { receipt.status = 'incomplete'; receipt.error = error.message; atomicJson(receiptFile, receipt); throw error; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--dest') throw Error('Use Install-DSH.ps1');
  install(args[1]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
