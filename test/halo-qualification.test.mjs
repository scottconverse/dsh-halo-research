import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ANALYSIS_FIXTURE,
  BENCHMARK_FIXTURE,
  DONOR_PROVENANCE,
  STRUCTURED_WRITE_FIXTURE,
  buildQualificationReceipt,
  benchmarkVerdict,
  createStructuredWriteFixture,
  verdictExactMarker,
  verifyStructuredWriteFixture,
} from '../stack/halo-routing/qualification.mjs';
import {
  candidateFingerprint,
  currentQualification,
  toDonorCandidate,
} from '../stack/halo-policy-deterministic/index.mjs';

const candidate = Object.freeze({
  candidateId: 'lmstudio/halo-verified-coder',
  provider: 'lmstudio',
  model: 'halo-verified-coder',
  executionClass: 'native-subagent',
  executionFingerprint: 'profile-sha256',
  runtimeVersion: 'dsh-0.1.1-rc.2',
  locality: 'local',
  billing: 'free',
  tier: 'premium',
});

function hostReceipt(overrides = {}) {
  return {
    producer: 'dsh-host',
    observationId: 'native-observation-1',
    executionPhase: 'post-terminal',
    executionFingerprint: 'profile-sha256',
    verifier: {
      kind: 'independent-code',
      version: 'devharmonics-qualify-2026-08',
      receiptId: 'native-evidence-1',
    },
    ...overrides,
  };
}

test('copies the smallest DevHarmonics analysis and benchmark fixtures exactly', () => {
  assert.deepEqual(DONOR_PROVENANCE, {
    devHarmonics: {
      repository: 'scottconverse/DevHarmonics',
      commit: 'ee369b4eca02e22f5279fac5985fe124a79cde78',
      file: 'scripts/qualify.mjs',
      functions: ['verdictExactMarker', 'parseBenchmarkResponse', 'benchmarkVerdict', 'createStructuredWriteFixture', 'runStructuredWriteSubprocess'],
    },
    codexFactory: {
      repository: 'scottconverse/codex-factory',
      commit: '51a31e01c5a7ae2233c79265521d2e30c3195991',
      file: 'scripts/factory-fleet.mjs',
      functions: ['candidateFingerprint', 'currentQualification'],
    },
  });
  assert.equal(ANALYSIS_FIXTURE.harness, 'analysis-exact-artifact-v1');
  assert.equal(ANALYSIS_FIXTURE.prompt, 'Reply with exactly DEVHARMONICS_ANALYSIS_QUALIFIED and no other text. Do not call tools.');
  assert.equal(verdictExactMarker(' DEVHARMONICS_ANALYSIS_QUALIFIED\n', 'DEVHARMONICS_ANALYSIS_QUALIFIED'), true);
  assert.equal(verdictExactMarker('DEVHARMONICS_ANALYSIS_QUALIFIED plus words', 'DEVHARMONICS_ANALYSIS_QUALIFIED'), false);
  assert.equal(BENCHMARK_FIXTURE.harness, 'structured-reasoning-v1');
  assert.equal(BENCHMARK_FIXTURE.prompt, 'Three tasks depend on task A. Task A takes 2 hours; each dependent task takes 1 hour and they can run in parallel once A finishes. Reply with ONLY a JSON object {"minimumHours": <number>} and no other text.');
  assert.equal(benchmarkVerdict('```json\n{"minimumHours":3}\n```').passed, true);
  assert.equal(benchmarkVerdict('{"minimumHours":2}').passed, false);
});

test('uses the donor structured-write fixture and its independent diff plus Python verifier', () => {
  assert.equal(STRUCTURED_WRITE_FIXTURE.harness, 'structured-file-worktree-v1');
  assert.equal(STRUCTURED_WRITE_FIXTURE.prompt, 'Edit add.py in this repository so that add(a, b) returns a + b instead of raising NotImplementedError. Only edit add.py - do not touch any other file.');
  assert.equal(STRUCTURED_WRITE_FIXTURE.nonCodexPrompt, `${STRUCTURED_WRITE_FIXTURE.prompt} Do not run any commands.`);
  const dir = mkdtempSync(path.join(os.tmpdir(), 'halo-qualification-'));
  try {
    createStructuredWriteFixture(dir);
    const untouched = verifyStructuredWriteFixture(dir);
    assert.equal(untouched.passed, false);
    assert.equal(untouched.diffNonEmpty, false);
    writeFileSync(path.join(dir, 'add.py'), 'def add(a, b):\n    return a + b\n');
    const verified = verifyStructuredWriteFixture(dir);
    assert.equal(verified.passed, true);
    assert.equal(verified.diffNonEmpty, true);
    assert.equal(verified.checkPassed, true);
    assert.equal(verified.detail, 'git diff nonempty; test_add.py passed');
    assert.equal(verified.evidence.diff.status, 0);
    assert.match(verified.evidence.diff.stdout, /diff --git a\/add\.py b\/add\.py/);
    assert.equal(verified.evidence.check.status, 0);
    assert.equal(verified.evidence.check.stdout, 'OK\r\n');
    assert.equal(verified.evidence.check.stderr, '');
    const receipt = buildQualificationReceipt({
      candidate,
      role: 'structured_write',
      finalText: null,
      fixtureVerification: verified,
      hostReceipt: hostReceipt(),
      finishedAt: '2026-09-07T12:00:00.000Z',
    });
    assert.equal(receipt.passed, true);
    assert.equal(receipt.harness, 'structured-file-worktree-v1');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('maps a host-measured analysis result into the exact donor receipt format', () => {
  const receipt = buildQualificationReceipt({
    candidate,
    role: 'analysis',
    finalText: 'DEVHARMONICS_ANALYSIS_QUALIFIED',
    hostReceipt: hostReceipt(),
    finishedAt: '2026-09-07T12:00:00.000Z',
  });
  const donorCandidate = toDonorCandidate(candidate, 'analysis');
  assert.deepEqual(receipt, {
    kind: 'qualification',
    schemaVersion: 1,
    observationId: 'native-observation-1',
    candidateId: donorCandidate.id,
    role: 'analysis',
    harness: 'analysis-exact-artifact-v1',
    fingerprint: candidateFingerprint(donorCandidate, 'analysis'),
    passed: true,
    finishedAt: '2026-09-07T12:00:00.000Z',
    executionFingerprint: 'profile-sha256',
    verifier: {
      kind: 'independent-code',
      version: 'devharmonics-qualify-2026-08',
      receiptId: 'native-evidence-1',
    },
  });
});

test('rejects self-authored or unmeasured qualification claims', () => {
  assert.throws(() => buildQualificationReceipt({
    candidate,
    role: 'analysis',
    finalText: 'DEVHARMONICS_ANALYSIS_QUALIFIED',
    hostReceipt: hostReceipt({ verifier: { kind: 'model', version: 'self', receiptId: 'claim' } }),
    finishedAt: '2026-09-07T12:00:00.000Z',
  }), /independent-code/);
  assert.throws(() => buildQualificationReceipt({
    candidate,
    role: 'analysis',
    finalText: 'DEVHARMONICS_ANALYSIS_QUALIFIED',
    hostReceipt: hostReceipt({ executionFingerprint: 'different-profile' }),
    finishedAt: '2026-09-07T12:00:00.000Z',
  }), /execution fingerprint/);
  assert.throws(() => buildQualificationReceipt({
    candidate,
    role: 'analysis',
    finalText: 'DEVHARMONICS_ANALYSIS_QUALIFIED',
    hostReceipt: hostReceipt({ executionPhase: 'dispatch-snapshot' }),
    finishedAt: '2026-09-07T12:00:00.000Z',
  }), /post-terminal/);
  assert.throws(() => buildQualificationReceipt({
    candidate,
    role: 'structured_write',
    finalText: null,
    fixtureVerification: { passed: true, diffNonEmpty: false, checkPassed: false },
    hostReceipt: hostReceipt(),
    finishedAt: '2026-09-07T12:00:00.000Z',
  }), /internally inconsistent/);
});

test('the exported donor currentQualification makes a newer exact failure invalidate a prior pass', () => {
  const pass = buildQualificationReceipt({
    candidate,
    role: 'benchmark',
    finalText: '{"minimumHours":3}',
    hostReceipt: hostReceipt({ observationId: 'native-observation-pass' }),
    finishedAt: '2026-09-07T12:00:00.000Z',
  });
  const fail = buildQualificationReceipt({
    candidate,
    role: 'benchmark',
    finalText: '{"minimumHours":2}',
    hostReceipt: hostReceipt({ observationId: 'native-observation-fail', verifier: { kind: 'independent-code', version: 'devharmonics-qualify-2026-08', receiptId: 'native-evidence-2' } }),
    finishedAt: '2026-09-07T12:01:00.000Z',
  });
  assert.equal(currentQualification(toDonorCandidate(candidate, 'benchmark'), [pass, fail], 'benchmark'), null);
});
