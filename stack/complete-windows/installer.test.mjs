import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
import { inside, verifyBundle, download, digest } from './files.mjs';
import { profile, MODEL } from './profile.mjs';
const source = path.dirname(fileURLToPath(import.meta.url));
const components = JSON.parse(fs.readFileSync(path.join(source, 'components.json')));
test('new profiles isolate paths, preserve exact cloud Low and bound local contexts', () => {
  const root = path.resolve('C:/DSH installation with spaces');
  const rows = profile(root, components);
  const config = rows.find(row => row.id === 'llm-pi-ai').config.providers.ollama;
  assert.equal(config.baseURL, 'http://127.0.0.1:11435/v1');
  const cloud = config.models.find(model => model.id === MODEL);
  assert.equal(cloud.contextWindow, 1048576); assert.deepEqual(cloud.reasoningEfforts, { low: 'low' });
  assert.equal(rows.find(row => row.id === 'agent-default-model').config.reasoningEffort, 'low');
  for (const model of config.models.filter(model => model.id !== MODEL)) {
    assert.equal(model.contextWindow, 16384); assert.equal(model.maxTokens, 4096);
    assert.equal(model.reasoningEfforts, undefined);
  }
  const inserted = rows.find(row => row.insert).insert;
  assert.equal(inserted.find(row => row.id === 'portable-three-role').config.stateFile, path.join(root, 'home/storages/three-role/projects.json'));
  assert.equal(inserted.find(row => row.id === 'complete-xerj').config.command, path.join(root, 'tools/node/node.exe'));
  assert(!JSON.stringify(rows).includes('C:/Users/scott'));
  // Local route uses the supported native model selector, not an illegal
  // host service declaration inside an agent-plane preset.
  assert(!inserted.filter(row => row.name === '@deepseek-ai/dsh-agent-preset').some(row => row.config.plugins.some(plugin => plugin.name === '@deepseek-ai/dsh-agent-default-model')));
  assert(!profile(root, components, 'desktop').some(row => ['webserver', 'web-runtime'].includes(row.id)));
});
test('bundle contains public implementations and detects tampering; existing outputs survive', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-bundle-'));
  try {
    const output = path.join(parent, 'bundle'); build(output);
    const manifest = verifyBundle(output);
    assert(manifest.files.some(row => row.path === 'stack/three-role/no-progress-guard.mjs'));
    assert(manifest.files.some(row => row.path.endsWith('mission-control.mjs')));
    assert(!manifest.files.some(row => /node_modules|settings.yaml|storages|sessions|credentials/.test(row.path)));
    assert.throws(() => build(output), /already exists/);
    const file = path.join(output, 'components.json'); fs.appendFileSync(file, ' ');
    assert.throws(() => verifyBundle(output), /Integrity mismatch/);
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
});
test('path traversal and cached artifact corruption fail closed', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-download-'));
  try {
    for (const value of ['../escape', '..\\escape', path.resolve(parent, 'absolute')]) assert.throws(() => inside(parent, value), /Unsafe|escapes/);
    const file = path.join(parent, 'archive.zip'); fs.writeFileSync(file, 'original');
    const sha256 = digest(file);
    await download(file, { sha256, url: 'https://invalid.example/no-network-required' });
    fs.appendFileSync(file, 'corruption');
    await assert.rejects(download(file, { sha256, url: 'https://invalid.example' }), /Integrity mismatch/);
    assert.equal(fs.readFileSync(file, 'utf8'), 'originalcorruption');
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
});

test('archive hashing handles multiple chunks and a partial final chunk', () => {
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-hash-'));
  try {
    const bytes=crypto.randomBytes(2*1024*1024+17),file=path.join(parent,'archive');fs.writeFileSync(file,bytes);
    for(const [algorithm,encoding] of [['sha256','hex'],['sha512','base64']])
      assert.equal(digest(file,algorithm,encoding),crypto.createHash(algorithm).update(bytes).digest(encoding));
  } finally {fs.rmSync(parent,{recursive:true,force:true});}
});


test('current hosts and embedded Desktop dashboard are pinned and bundled with private ownership', () => {
  const runtime=JSON.parse(fs.readFileSync(path.join(source,'runtime-package.json')));
  assert.equal(components.version,'0.1.2');
  assert.equal(components.dsh,'0.2.2-rc.1');
  assert.ok(components.desktop.url.endsWith('deepseek-harness-0.2.2-rc.1-win-x64.exe'));
  for(const [name,pin] of Object.entries(runtime.dependencies)) if(name.startsWith('@deepseek-ai/')) assert.equal(pin,components.dsh,name);
  const root=path.resolve('C:/DSH Complete new root');
  const desktop=profile(root,components,'desktop').find(row=>row.insert).insert;
  const panel=desktop.find(row=>row.id==='desktop-mission-control');
  assert.equal(panel.config.port,3191);
  assert.equal(panel.config.deploymentRoot,root);
  assert.equal(panel.config.repositoryProfile,path.join(root,'desktop-profile/cordis.patch.yml'));
  assert.equal(panel.config.ollamaOnly,true);
  assert.equal(panel.config.ollamaOrigin,'http://127.0.0.1:11435');
  assert(!profile(root,components,'web').find(row=>row.insert).insert.some(row=>row.id==='desktop-mission-control'));
  assert.equal(new Set(Object.values(components.ports)).size,Object.values(components.ports).length);
  for(const port of [3080,3090,3091,9200,18080])assert(!Object.values(components.ports).includes(port));
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'dsh-embedded-'));
  try{
    const output=path.join(parent,'bundle');build(output);const manifest=verifyBundle(output);
    for(const name of ['index.mjs','client.js','dashboard.mjs','package.json','cordis.patch.yml'])assert(manifest.files.some(row=>row.path==='stack/desktop-mission-control/'+name));
    assert(fs.readFileSync(path.join(output,'stack/desktop-mission-control/client.js'),'utf8').includes("const ORIGIN = 'http://127.0.0.1:3191'"));
  }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
