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
