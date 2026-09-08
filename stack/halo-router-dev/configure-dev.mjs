import { mkdir, readFile, writeFile, stat, symlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const devRoot = path.dirname(fileURLToPath(import.meta.url));
const devHome = path.join(devRoot, 'home');
const productionHome = path.join(process.env.USERPROFILE ?? '', '.dsh');
const webPatch = path.join(devHome, 'profiles', 'web', 'cordis.patch.yml');
const homePatch = path.join(devHome, 'cordis.patch.yml');
const preset = path.join(devHome, '.agent-presets', 'halo-orchestrator', 'agent.cordis.yml');
const presetManifest = path.join(devHome, '.agent-presets', 'halo-orchestrator', 'preset.yml');
const profilePackage = path.join(devHome, 'profiles', 'web', 'package.json');
const productionProfilePackage = path.join(productionHome, 'profiles', 'web', 'package.json');

const paths = {
  memory: path.join(devHome, 'memory'),
  nativeCli: path.join(devHome, 'native-cli'),
  gateRuns: path.join(devHome, 'gate-runs'),
  workspaces: path.join(devHome, 'workspaces'),
};

const yamlPath = value => value.replaceAll('\\', '/');
const quotePath = value => value.replaceAll("'", "''");
const devMemory = quotePath(path.resolve(paths.memory));
const devNativeCli = yamlPath(path.resolve(paths.nativeCli));
const devGateRuns = quotePath(path.resolve(paths.gateRuns));
const routingPlugin = yamlPath(path.resolve(path.join(devRoot, '..', 'halo-routing', 'index.mjs')));
const policyPlugin = yamlPath(path.resolve(path.join(devRoot, '..', 'halo-policy-deterministic', 'index.mjs')));
const workerPlugin = yamlPath(path.resolve(path.join(devRoot, '..', 'halo-verified-coder-dev', 'index.mjs')));
const uiName='@deepseek-ai/dsh-halo-routing-ui';
const uiRoot=path.resolve(devRoot,'../halo-routing/ui');
const uiDependency='link:'+yamlPath(uiRoot);
function originalDependencies(pkg){const dependencies={...pkg.dependencies};if(dependencies[uiName]!==undefined&&dependencies[uiName]!==uiDependency)throw Error('Unexpected DEV UI dependency');delete dependencies[uiName];return dependencies;}
async function wireUi(){
 const link=path.join(devHome,'profiles/web/node_modules',uiName);
 await mkdir(path.dirname(link),{recursive:true});
 try{if(path.resolve(await realpath(link))!==uiRoot)throw Error('Existing UI module link points elsewhere');}catch(e){if(e.code!=='ENOENT')throw e;await symlink(uiRoot,link,'junction');}
 const pkg=JSON.parse(await readFile(profilePackage,'utf8'));
 if(pkg.dependencies[uiName]!==uiDependency){pkg.dependencies[uiName]=uiDependency;await writeFile(profilePackage,JSON.stringify(pkg,null,2)+'\n');}
}

async function replaceOnce(file, source, target) {
  const before = await readFile(file, 'utf8');
  const after = before.replace(source, target);
  if (before === after && !before.includes(target)) {
    throw new Error(`expected DEV configuration marker in ${file}: ${source}`);
  }
  if (after !== before) await writeFile(file, after);
}

async function disableGateway() {
  const before = await readFile(webPatch, 'utf8');
  const start = before.indexOf('- id: mcp-halo-research');
  const end = before.indexOf('\n\n    # Local, account-free persistent knowledge graph.', start);
  if (start < 0 || end < 0) throw new Error('expected Gateway row in DEV profile');
  const replacement = '- id: mcp-halo-research\n      # Gateway is deliberately excluded from this DEV profile.\n      disabled: true';
  const after = before.slice(0, start) + replacement + before.slice(end);
  if (after !== before) await writeFile(webPatch, after);
}

async function writeHomePatch() {
  const text = [
    '# DEV-only Halo Router composition. Production $DSH_HOME never reads this file.',
    '- insert:',
    '    - id: halo-routing',
    `      name: file:///${routingPlugin}`,
    '      config:',
    `        home: ${yamlPath(path.resolve(devHome))}`,
    `        gateRoot: ${yamlPath(path.resolve(paths.gateRuns))}`,
    '',
    '    - id: halo-policy-deterministic',
    `      name: file:///${policyPlugin}`,
    '',
    '    - id: halo-routing-ui',
    `      name: '${uiName}'`,
    '',
  ].join('\n');
  const acceptance = process.argv.includes('--acceptance') ? `\n    - id: halo-router-acceptance\n      name: file:///${yamlPath(path.join(devRoot,'acceptance-driver.mjs'))}\n      config:\n        home: ${yamlPath(devHome)}\n` : '';
  await writeFile(homePatch, text + acceptance);
}

async function configure() {
  await mkdir(paths.memory, { recursive: true });
  await mkdir(paths.nativeCli, { recursive: true });
  await mkdir(paths.gateRuns, { recursive: true });
  await mkdir(paths.workspaces, { recursive: true });

  // These are the only copied production storage coordinates. The provider
  // HOME/CODEX_HOME values intentionally remain user-owned: changing them
  // would remove the signed-in native CLI lanes rather than isolate DSH data.
  await replaceOnce(webPatch, "cwd: 'C:\\Users\\scott\\.dsh\\memory'", `cwd: '${devMemory}'`);
  await replaceOnce(webPatch, "MEMORY_FILE_PATH: 'C:\\Users\\scott\\.dsh\\memory\\memory.json'", `MEMORY_FILE_PATH: '${devMemory}/memory.json'`);
  await replaceOnce(webPatch, 'dataRoot: C:/Users/scott/.dsh/native-cli', `dataRoot: ${devNativeCli}`);
  await disableGateway();
  await wireUi();
  await writeHomePatch();
  await replaceOnce(preset, 'file:///C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-verified-coder/index.mjs?v=10', `file:///${workerPlugin}`);
  await replaceOnce(preset, "runRoot: 'C:\\Users\\scott\\AppData\\Local\\HaloGate\\runs'", `runRoot: '${devGateRuns}'`);
  const presetText = await readFile(preset, 'utf8');
  if (!presetText.includes('        routing: true')) {
    await writeFile(preset, presetText.replace(`        runRoot: '${devGateRuns}'`, `        routing: true\n        runRoot: '${devGateRuns}'`));
  }

  await writeFile(presetManifest, [
    'name: Halo Router DEV',
    'description: Halo Router DEV — human-controlled automatic planner and worker routing.',
    'order: 1',
    '',
  ].join('\n'));

  const devPackage = JSON.parse(await readFile(profilePackage, 'utf8'));
  const productionPackage = JSON.parse(await readFile(productionProfilePackage, 'utf8'));
  if (JSON.stringify(originalDependencies(devPackage)) !== JSON.stringify(productionPackage.dependencies)) {
    throw new Error('DEV profile native/custom dependency coordinates differ from production');
  }
  if (JSON.stringify(devPackage.dsh) !== JSON.stringify(productionPackage.dsh)) {
    throw new Error('DEV profile bundle coordinates differ from production');
  }

  const output = {
    profile: 'halo-router-dev',
    branding: 'Halo Router DEV',
    port: 3085,
    dshHome: path.resolve(devHome),
    writableRoots: Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, path.resolve(value)])),
    gateway: 'disabled',
    productionHomeReadOnly: path.resolve(productionHome),
    nativeAndCustomPackageCoordinates: 'match-production',
  };
  await writeFile(path.join(devHome, 'DEV-PROFILE.json'), `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output));
}

async function check() {
  const files = [homePatch, webPatch, preset, presetManifest, profilePackage, productionProfilePackage];
  for (const file of files) await stat(file);
  const [homePatchText, patchText, presetText, manifestText, devText, productionText] = await Promise.all(files.map(file => readFile(file, 'utf8')));
  for (const forbidden of ['C:\\Users\\scott\\.dsh', 'C:/Users/scott/.dsh', 'C:\\Users\\scott\\AppData\\Local\\HaloGate\\runs']) {
    if (homePatchText.includes(forbidden) || patchText.includes(forbidden) || presetText.includes(forbidden)) throw new Error(`production writable path remains: ${forbidden}`);
  }
  if (!patchText.includes('- id: mcp-halo-research\n      # Gateway is deliberately excluded from this DEV profile.\n      disabled: true') || patchText.includes('url: http://127.0.0.1:8765/mcp')) throw new Error('Gateway is not disabled in DEV');
  if (!homePatchText.includes(`file:///${routingPlugin}`) || !homePatchText.includes(`file:///${policyPlugin}`) || !homePatchText.includes(`gateRoot: ${yamlPath(path.resolve(paths.gateRuns))}`)) throw new Error('DEV routing plugins are not wired to DEV storage');
  if (!presetText.includes(`file:///${workerPlugin}`)) throw new Error('DEV worker plugin is still pointed at production');
  if (!manifestText.includes('name: Halo Router DEV')) throw new Error('DEV branding is missing');
  const devPackage = JSON.parse(devText);
  const productionPackage = JSON.parse(productionText);
  if (JSON.stringify(originalDependencies(devPackage)) !== JSON.stringify(productionPackage.dependencies) || JSON.stringify(devPackage.dsh) !== JSON.stringify(productionPackage.dsh)) {
    throw new Error('DEV package coordinates do not match production');
  }
  console.log(JSON.stringify({ checked: files.length, productionWritablePathsAbsent: true, gatewayDisabled: true, packageCoordinatesMatch: true }));
}

if (process.argv.includes('--disable-router')) {
  await writeFile(homePatch, '# DEV router unmounted. Production is unchanged.\n[]\n');
  console.log('DEV observation/policy plugins unmounted for the next DEV restart.');
}
else if (process.argv.includes('--check')) await check();
else await configure();
