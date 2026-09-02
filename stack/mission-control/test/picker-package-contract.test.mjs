import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const stack = path.join(here, '..', '..');
const artifact = path.join(stack, 'packages', 'deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2.tgz');
const installer = fs.readFileSync(path.join(stack, 'Install-HaloPickerOverride.ps1'), 'utf8');

function tar(...args) {
  return execFileSync('tar.exe', args, { encoding: 'utf8', windowsHide: true });
}

test('versioned picker archive is a standalone pnpm package with its license', () => {
  const members = tar('-tf', artifact).split(/\r?\n/).filter(Boolean);
  assert.ok(members.includes('package/LICENSE'), 'standalone archive must carry the MIT license');
  const manifestText = tar('-xOf', artifact, 'package/package.json');
  assert.doesNotMatch(manifestText, /workspace:/, 'workspace protocol ranges cannot install outside the monorepo');
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.name, '@deepseek-ai/dsh-client-ui-model-selection');
  assert.equal(manifest.version, '0.1.1-rc.2');
  assert.equal(manifest.main, 'lib/index.js');
  assert.equal(manifest.exports['./client'].default, './lib/client.js');
});

test('installer pins the archive bytes and independently rejects malformed package shape', () => {
  const digest = crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex').toUpperCase();
  const pin = /\$reviewedArtifactSha256\s*=\s*'([A-F0-9]{64})'/.exec(installer)?.[1];
  assert.equal(pin, digest);
  assert.match(installer, /package\\LICENSE/);
  assert.match(installer, /workspace:/);
  assert.match(installer, /Packed picker license/);
});

test('installer backup records enough identity to validate a restored picker package', () => {
  assert.match(installer, /installedManifestSha256/);
  assert.match(installer, /installedClientSha256/);
  assert.match(installer, /installedIndexSha256/);
  assert.match(installer, /installedInvariantSha256/);
  assert.match(installer, /Assert-ReviewedInstalledPackage/);
});

test('installer honors an alternate DshHome by deriving the profile-local file dependency', () => {
  assert.match(installer, /GetRelativePath\(\$profileRoot,\s*\$artifactPath\)/);
  assert.match(installer, /\.dsh['"]?\)?[\s\S]{0,500}profiles\\web/);
});

test('repair replaces a same-version picker instead of retaining its stale installed bundle', () => {
  assert.ok(/& \$pnpmCmd --config.offline=true --config.ignore-scripts=true remove \$packageName/.test(installer),
    'remove only the picker through pnpm before adding the reviewed same-version artifact');
});
