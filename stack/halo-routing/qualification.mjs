import {
  QUALIFICATION_HARNESSES,
  candidateFingerprint,
  toDonorCandidate,
} from '../halo-policy-deterministic/index.mjs';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Extracted unchanged from DevHarmonics scripts/qualify.mjs at local source
// ee369b4eca02e22f5279fac5985fe124a79cde78. The Factory lineage is
// scottconverse/codex-factory scripts/factory-fleet.mjs at
// 51a31e01c5a7ae2233c79265521d2e30c3195991; the selector module owns its
// donor candidate conversion and fingerprinting.
const ANALYSIS_MARKER = "DEVHARMONICS_ANALYSIS_QUALIFIED";
const ANALYSIS_PROMPT = `Reply with exactly ${ANALYSIS_MARKER} and no other text. Do not call tools.`;
const BENCHMARK_PROMPT = 'Three tasks depend on task A. Task A takes 2 hours; each dependent task takes 1 hour and they can run in parallel once A finishes. Reply with ONLY a JSON object {"minimumHours": <number>} and no other text.';

export const ANALYSIS_FIXTURE = Object.freeze({
  role: 'analysis',
  harness: 'analysis-exact-artifact-v1',
  prompt: ANALYSIS_PROMPT,
  marker: ANALYSIS_MARKER,
});

export const BENCHMARK_FIXTURE = Object.freeze({
  role: 'benchmark',
  harness: 'structured-reasoning-v1',
  prompt: BENCHMARK_PROMPT,
});

// The original DevHarmonics structured-write qualification fixture. The
// caller creates it in an isolated worktree, dispatches a native DSH worker,
// then invokes verifyStructuredWriteFixture; no worker-authored success text
// is accepted as a verdict.
const FIXTURE_ADD_PY = 'def add(a, b):\n    raise NotImplementedError("add is not implemented yet")\n';
const FIXTURE_TEST_ADD_PY = [
  'from add import add',
  '',
  'def test_add():',
  '    assert add(2, 3) == 5',
  '',
  'if __name__ == "__main__":',
  '    test_add()',
  '    print("OK")',
  '',
].join('\n');
const STRUCTURED_WRITE_PROMPT = 'Edit add.py in this repository so that add(a, b) returns a + b instead of raising NotImplementedError. Only edit add.py - do not touch any other file.';

export const DONOR_PROVENANCE = Object.freeze({
  devHarmonics: Object.freeze({
    repository: 'scottconverse/DevHarmonics',
    commit: 'ee369b4eca02e22f5279fac5985fe124a79cde78',
    file: 'scripts/qualify.mjs',
    functions: Object.freeze(['verdictExactMarker', 'parseBenchmarkResponse', 'benchmarkVerdict', 'createStructuredWriteFixture', 'runStructuredWriteSubprocess']),
  }),
  codexFactory: Object.freeze({
    repository: 'scottconverse/codex-factory',
    commit: '51a31e01c5a7ae2233c79265521d2e30c3195991',
    file: 'scripts/factory-fleet.mjs',
    functions: Object.freeze(['candidateFingerprint', 'currentQualification']),
  }),
});

export const STRUCTURED_WRITE_FIXTURE = Object.freeze({
  role: 'structured_write',
  harness: 'structured-file-worktree-v1',
  prompt: STRUCTURED_WRITE_PROMPT,
  nonCodexPrompt: `${STRUCTURED_WRITE_PROMPT} Do not run any commands.`,
  files: Object.freeze({ 'add.py': FIXTURE_ADD_PY, 'test_add.py': FIXTURE_TEST_ADD_PY }),
  check: Object.freeze({ command: 'python', args: Object.freeze(['test_add.py']) }),
});

/** Exact-match verdict for the analysis harness: no trailing commentary tolerated. */
export function verdictExactMarker(text, marker) {
  return typeof text === "string" && text.trim() === marker;
}

/** Local models routinely fence strict-JSON output despite being told not to — tolerate it. */
function stripFences(text) {
  const trimmed = (text ?? "").trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1] : trimmed;
}

/** Parse the structured-reasoning-v1 benchmark response. Never throws. */
export function parseBenchmarkResponse(text) {
  const stripped = stripFences(text);
  let parsed;
  try {
    parsed = JSON.parse(stripped);
  } catch (error) {
    return { ok: false, minimumHours: null, error: `not valid JSON: ${error.message}` };
  }
  if (!parsed || typeof parsed !== "object" || typeof parsed.minimumHours !== "number") {
    return { ok: false, minimumHours: null, error: 'response JSON must be an object with a numeric "minimumHours"' };
  }
  return { ok: true, minimumHours: parsed.minimumHours, error: null };
}

/** Pass iff the parsed response's minimumHours is exactly 3 (the correct answer). */
export function benchmarkVerdict(text) {
  const parsed = parseBenchmarkResponse(text);
  return { passed: parsed.ok && parsed.minimumHours === 3, parsed };
}

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 30_000, windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed in ${cwd}: ${result.stderr}`);
  }
  return result.stdout;
}

/** Exact donor fixture creator; its directory must be throwaway. */
export function createStructuredWriteFixture(dir) {
  mkdirSync(dir, { recursive: true });
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.email', 'qualify@devharmonics.local']);
  git(dir, ['config', 'user.name', 'DevHarmonics Qualify']);
  writeFileSync(path.join(dir, 'add.py'), FIXTURE_ADD_PY);
  writeFileSync(path.join(dir, 'test_add.py'), FIXTURE_TEST_ADD_PY);
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'init qualification fixture']);
}

// Copied from DevHarmonics scripts/path-resolve.mjs so the Python check uses
// the same PATH/PATHEXT behavior as its original structured-write harness.
function resolvePathCommand(name, { platform = process.platform, env = process.env } = {}) {
  const pathValue = env.PATH ?? env.Path ?? env.path ?? '';
  const separator = platform === 'win32' ? ';' : ':';
  const directories = pathValue.split(separator).filter(Boolean);
  const suffixes = platform === 'win32'
    ? [...(env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean), '']
    : [''];
  for (const directory of directories) {
    for (const suffix of suffixes) {
      const candidate = path.join(directory, `${name}${suffix}`);
      if (!existsSync(candidate)) continue;
      try {
        if (!statSync(candidate).isFile()) continue;
      } catch {
        continue;
      }
      return candidate;
    }
  }
  return null;
}

/**
 * The donor's independent structured-write verdict: a nonempty real diff and
 * the original `python test_add.py` check must both succeed.
 */
export function verifyStructuredWriteFixture(repository, { env = process.env } = {}) {
  assertNonemptyString(repository, 'repository');
  const diff = spawnSync('git', ['-C', repository, 'diff'], { encoding: 'utf8', timeout: 30_000, windowsHide: true, env });
  const diffNonEmpty = Boolean(diff.stdout && diff.stdout.trim().length > 0);
  const resolvedPython = resolvePathCommand('python', { env });
  let checkPassed = false;
  let checkDetail;
  let check = null;
  if (!resolvedPython) {
    checkDetail = '"python" not found on PATH';
  } else {
    check = spawnSync(resolvedPython, ['test_add.py'], { cwd: repository, encoding: 'utf8', env, timeout: 30_000, windowsHide: true });
    checkPassed = check.status === 0;
    checkDetail = checkPassed
      ? 'test_add.py passed'
      : `test_add.py exited ${check.status ?? 'null'}: ${(check.stderr || check.stdout || '').slice(0, 500)}`;
  }
  return Object.freeze({
    passed: diffNonEmpty && checkPassed,
    diffNonEmpty,
    checkPassed,
    detail: `${diffNonEmpty ? 'git diff nonempty' : 'git diff EMPTY'}; ${checkDetail}`,
    evidence: Object.freeze({
      diff: Object.freeze({
        status: diff.status ?? null,
        stdout: diff.stdout ?? '',
        stderr: diff.stderr ?? '',
        error: diff.error ? String(diff.error.message ?? diff.error) : null,
      }),
      check: Object.freeze({
        command: resolvedPython ?? null,
        status: check?.status ?? null,
        stdout: check?.stdout ?? '',
        stderr: check?.stderr ?? '',
        error: check?.error ? String(check.error.message ?? check.error) : null,
      }),
    }),
  });
}

function assertNonemptyString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} must be a nonempty string`);
}

function verdictFor(role, finalText, fixtureVerification) {
  if (role === 'analysis') return verdictExactMarker(finalText, ANALYSIS_MARKER);
  if (role === 'benchmark') return benchmarkVerdict(finalText).passed;
  if (role === 'structured_write') {
    if (fixtureVerification === null || typeof fixtureVerification !== 'object') {
      throw new TypeError('structured_write requires fixtureVerification');
    }
    if (fixtureVerification.passed !== (fixtureVerification.diffNonEmpty === true && fixtureVerification.checkPassed === true)) {
      throw new TypeError('structured_write fixture verification is internally inconsistent');
    }
    return fixtureVerification.passed;
  }
  throw new TypeError(`No host-verifiable donor fixture for role: ${role}`);
}

/**
 * Bind an independently verified, post-terminal native DSH result to the
 * donor's exact candidate/role/harness record. `passed` is deliberately not an
 * input: the model's text is evaluated by the copied deterministic verifier.
 * Storage remains the plugin ledger's responsibility.
 */
export function buildQualificationReceipt({ candidate, role, finalText, fixtureVerification = null, hostReceipt, finishedAt }) {
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new TypeError('candidate must be an object');
  }
  if (hostReceipt === null || typeof hostReceipt !== 'object' || Array.isArray(hostReceipt)) {
    throw new TypeError('hostReceipt must be an object');
  }
  assertNonemptyString(role, 'role');
  assertNonemptyString(candidate.executionFingerprint, 'candidate.executionFingerprint');
  assertNonemptyString(finishedAt, 'finishedAt');
  assertNonemptyString(hostReceipt.observationId, 'hostReceipt.observationId');
  assertNonemptyString(hostReceipt.executionFingerprint, 'hostReceipt.executionFingerprint');
  if (hostReceipt.executionPhase !== 'post-terminal') throw new TypeError('hostReceipt must bind a post-terminal execution');
  if (hostReceipt.executionFingerprint !== candidate.executionFingerprint) {
    throw new TypeError('host receipt execution fingerprint must match candidate execution fingerprint');
  }
  const verifier = hostReceipt.verifier;
  if (verifier === null || typeof verifier !== 'object' || Array.isArray(verifier)) {
    throw new TypeError('hostReceipt.verifier must be an object');
  }
  if (verifier.kind !== 'independent-code') throw new TypeError('hostReceipt.verifier.kind must be independent-code');
  assertNonemptyString(verifier.version, 'hostReceipt.verifier.version');
  assertNonemptyString(verifier.receiptId, 'hostReceipt.verifier.receiptId');
  const harness = QUALIFICATION_HARNESSES[role];
  if (!harness) throw new TypeError(`Unknown qualification role: ${role}`);
  if (!['analysis', 'benchmark', 'structured_write'].includes(role)) throw new TypeError(`No host-verifiable donor fixture for role: ${role}`);
  const donorCandidate = toDonorCandidate(candidate, role);
  return Object.freeze({
    kind: 'qualification',
    schemaVersion: 1,
    observationId: hostReceipt.observationId,
    candidateId: donorCandidate.id,
    role,
    harness,
    fingerprint: candidateFingerprint(donorCandidate, role),
    passed: verdictFor(role, finalText, fixtureVerification),
    finishedAt,
    executionFingerprint: hostReceipt.executionFingerprint,
    verifier: Object.freeze({
      kind: verifier.kind,
      version: verifier.version,
      receiptId: verifier.receiptId,
    }),
  });
}
