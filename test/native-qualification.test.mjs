import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readNativeQualificationResult } from '../stack/halo-routing/native-qualification.mjs';

async function devHome() {
  const home = await mkdtemp(path.join(tmpdir(), 'halo-native-qualification-'));
  await mkdir(path.join(home, 'native-cli', 'receipts'), { recursive: true });
  return home;
}

async function receipt(home, file, record) {
  const receiptPath = path.join(home, 'native-cli', 'receipts', file);
  const raw = JSON.stringify(record, null, 2);
  await writeFile(receiptPath, raw, 'utf8');
  return {
    receiptPath,
    receiptHash: createHash('sha256').update(raw).digest('hex'),
  };
}

const nativeRecord = (overrides = {}) => ({
  started: '2026-09-07T12:00:00.000Z',
  finished: '2026-09-07T12:01:00.000Z',
  provider: 'claude-cli',
  model: 'sonnet',
  sessionId: 'qualification-session',
  result: { ok: true, status: 'completed', final: 'DEVHARMONICS_ANALYSIS_QUALIFIED' },
  ...overrides,
});

test('returns the newest exact DEV receipt raw native final instead of synthetic display text', async () => {
  const home = await devHome();
  await receipt(home, '9999999999999-unrelated.json', nativeRecord({ sessionId: 'another-session' }));
  const expected = await receipt(home, '1000000000000-native.json', nativeRecord());

  const result = await readNativeQualificationResult(home, {
    sessionId: 'qualification-session', provider: 'claude-cli', model: 'sonnet',
  });

  assert.deepEqual(result, {
    ok: true,
    final: 'DEVHARMONICS_ANALYSIS_QUALIFIED',
    status: 'completed',
    finishedAt: '2026-09-07T12:01:00.000Z',
    receiptPath: expected.receiptPath,
    receiptHash: expected.receiptHash,
  });
  assert.equal(result.final.includes('[Claude Code'), false);
});

test('selects by immutable finished timestamp rather than receipt filename order', async () => {
  const home = await devHome();
  await receipt(home, '9999999999999-earlier-name.json', nativeRecord({
    finished: '2026-09-07T12:01:00.000Z',
    result: { ok: true, status: 'completed', final: 'OLD_NATIVE_FINAL' },
  }));
  const latest = await receipt(home, '0000000000001-later-name.json', nativeRecord({
    finished: '2026-09-07T12:02:00.000Z',
    result: { ok: true, status: 'completed', final: 'LATEST_NATIVE_FINAL' },
  }));

  const result = await readNativeQualificationResult(home, {
    sessionId: 'qualification-session', provider: 'claude-cli', model: 'sonnet',
  });

  assert.equal(result.final, 'LATEST_NATIVE_FINAL');
  assert.equal(result.receiptPath, latest.receiptPath);
});

test('newest exact failed native receipt remains a failure and invalidates an earlier pass', async () => {
  const home = await devHome();
  await receipt(home, 'previous-pass.json', nativeRecord({
    finished: '2026-09-07T12:01:00.000Z',
    result: { ok: true, status: 'completed', final: 'DEVHARMONICS_ANALYSIS_QUALIFIED' },
  }));
  const failed = await receipt(home, 'current-failure.json', nativeRecord({
    finished: '2026-09-07T12:02:00.000Z',
    result: { ok: false, status: 'failed', final: 'native verifier execution failed' },
  }));

  const result = await readNativeQualificationResult(home, {
    sessionId: 'qualification-session', provider: 'claude-cli', model: 'sonnet',
  });

  assert.equal(result.ok, false);
  assert.equal(result.final, 'native verifier execution failed');
  assert.equal(result.status, 'failed');
  assert.equal(result.receiptPath, failed.receiptPath);
});

test('rejects an exact receipt that finished before the qualification run began', async () => {
  const home = await devHome();
  await receipt(home, 'stale-pass.json', nativeRecord({
    finished: '2026-09-07T12:01:00.000Z',
  }));

  const result = await readNativeQualificationResult(home, {
    sessionId: 'qualification-session', provider: 'claude-cli', model: 'sonnet',
    notBefore: '2026-09-07T12:01:00.001Z',
  });

  assert.equal(result, null);
});

test('accepts an exact receipt finished at or after the qualification run began', async () => {
  const home = await devHome();
  const fresh = await receipt(home, 'fresh-pass.json', nativeRecord({
    finished: '2026-09-07T12:02:00.000Z',
    result: { ok: true, status: 'completed', final: 'FRESH_NATIVE_FINAL' },
  }));

  const result = await readNativeQualificationResult(home, {
    sessionId: 'qualification-session', provider: 'claude-cli', model: 'sonnet',
    notBefore: '2026-09-07T12:02:00.000Z',
  });

  assert.equal(result.final, 'FRESH_NATIVE_FINAL');
  assert.equal(result.receiptPath, fresh.receiptPath);
});

test('does not accept partial bindings, malformed timestamps, or receipts outside the DEV native path', async () => {
  const home = await devHome();
  await receipt(home, 'wrong-provider.json', nativeRecord({ provider: 'codex-cli' }));
  await receipt(home, 'wrong-model.json', nativeRecord({ model: 'opus' }));
  await receipt(home, 'wrong-session.json', nativeRecord({ sessionId: 'other-session' }));
  await receipt(home, 'missing-finished.json', nativeRecord({ finished: 'not-a-timestamp' }));
  await mkdir(path.join(home, 'receipts'), { recursive: true });
  await writeFile(path.join(home, 'receipts', 'outside-native-cli.json'), JSON.stringify(nativeRecord()), 'utf8');

  const result = await readNativeQualificationResult(home, {
    sessionId: 'qualification-session', provider: 'claude-cli', model: 'sonnet',
  });

  assert.equal(result, null);
});

test('returns null when the requested DEV receipt directory is absent', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'halo-native-qualification-missing-'));

  const result = await readNativeQualificationResult(home, {
    sessionId: 'qualification-session', provider: 'claude-cli', model: 'sonnet',
  });

  assert.equal(result, null);
});
