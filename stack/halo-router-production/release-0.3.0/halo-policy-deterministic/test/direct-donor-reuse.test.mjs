import assert from "node:assert/strict";
import test from "node:test";

import {
  DSH_RUNTIME_VERSION,
  candidateFingerprint,
  recommend,
  selectCandidate,
  toDonorCandidate,
} from "../index.mjs";

function candidate(overrides = {}) {
  return {
    candidateId: "lmstudio/halo/qwen3-coder-30b-a3b-q4km",
    provider: "lmstudio",
    model: "halo/qwen3-coder-30b-a3b-q4km",
    executionClass: "lmstudio",
    locality: "local",
    billing: "free",
    available: null,
    catalogState: "registered",
    contextWindow: 32_768,
    capabilities: ["text", "tools"],
    qualificationState: "unknown",
    executionFingerprint: "profile-a",
    ...overrides,
  };
}

function qualification(value, role, passed = true, finishedAt = "2026-09-07T00:00:00.000Z") {
  const donor = toDonorCandidate(value, role);
  return {
    candidateId: donor.id,
    role,
    fingerprint: candidateFingerprint(donor, role),
    passed,
    finishedAt,
  };
}

test("projects an exact Halo candidate into the pinned DevHarmonics candidate shape", () => {
  assert.deepEqual(toDonorCandidate(candidate(), "analysis"), {
    id: "lmstudio/halo/qwen3-coder-30b-a3b-q4km",
    lane: "http",
    provider: "lmstudio",
    model: "halo/qwen3-coder-30b-a3b-q4km",
    tier: "standard",
    runtimeVersion: DSH_RUNTIME_VERSION,
    digest: "profile-a",
    paid: false,
  });
  assert.deepEqual(toDonorCandidate(candidate({
    candidateId: "codex-cli/gpt-5.6-terra",
    provider: "codex-cli",
    model: "gpt-5.6-terra",
    executionClass: "codex-cli",
    locality: "remote",
    billing: "subscription",
  }), "analysis"), {
    id: "codex-cli/gpt-5.6-terra",
    lane: "subprocess",
    provider: "codex-cli",
    model: "gpt-5.6-terra",
    tier: "premium",
    runtimeVersion: DSH_RUNTIME_VERSION,
    digest: "profile-a",
    paid: true,
  });
});

test("returns no qualified recommendation when the qualification ledger is empty", () => {
  const result = recommend({
    workload: { role: "analysis", requiredTier: "economy" },
    candidates: [candidate()],
    qualifications: [],
  });
  assert.equal(result.recommendedCandidateId, null);
  assert.deepEqual(result.acceptedCandidateIds, []);
  assert.deepEqual(result.rejectedCandidateIds, [candidate().candidateId]);
  assert.match(result.explanation, /no currently qualified candidate/i);
  assert.ok(result.evaluations[0].reasons.some((reason) => reason.code === "QUALIFICATION_NOT_CURRENT"));
});

test("a later failed result replaces an earlier pass for the exact fingerprint", () => {
  const value = candidate();
  const result = recommend({
    workload: { role: "analysis" },
    candidates: [value],
    qualifications: [
      qualification(value, "analysis", true, "2026-09-07T00:00:00.000Z"),
      qualification(value, "analysis", false, "2026-09-07T00:01:00.000Z"),
    ],
  });
  assert.equal(result.recommendedCandidateId, null);
});

test("structured_write requires exact current role and benchmark qualifications", () => {
  const value = candidate({ tier: "standard" });
  const roleOnly = recommend({
    workload: { role: "structured_write", requiredTier: "standard" },
    candidates: [value],
    qualifications: [qualification(value, "structured_write")],
  });
  assert.equal(roleOnly.recommendedCandidateId, null);
  assert.ok(roleOnly.evaluations[0].reasons.some((reason) => reason.code === "BENCHMARK_NOT_CURRENT"));

  const fullyQualified = recommend({
    workload: { role: "structured_write", requiredTier: "standard" },
    candidates: [value],
    qualifications: [qualification(value, "structured_write"), qualification(value, "benchmark")],
  });
  assert.equal(fullyQualified.recommendedCandidateId, value.candidateId);
});

test("execution profile, runtime, tier, and role harness are exact fingerprint inputs", () => {
  const base = toDonorCandidate(candidate(), "analysis");
  const fingerprint = candidateFingerprint(base, "analysis");
  assert.notEqual(candidateFingerprint({ ...base, digest: "profile-b" }, "analysis"), fingerprint);
  assert.notEqual(candidateFingerprint({ ...base, runtimeVersion: "DSH/next" }, "analysis"), fingerprint);
  assert.notEqual(candidateFingerprint({ ...base, tier: "premium" }, "analysis"), fingerprint);
  assert.notEqual(candidateFingerprint(base, "benchmark"), fingerprint);

  const changed = candidate({ executionFingerprint: "profile-b" });
  assert.equal(recommend({
    workload: { role: "analysis" },
    candidates: [changed],
    qualifications: [qualification(candidate(), "analysis")],
  }).recommendedCandidateId, null, "a stale Halo execution profile must not qualify the current donor projection");
});

test("forwards explicit exclusions to the donor selector", () => {
  const local = candidate();
  const remote = candidate({
    candidateId: "codex-cli/gpt-5.6-terra",
    provider: "codex-cli",
    model: "gpt-5.6-terra",
    executionClass: "codex-cli",
    locality: "remote",
    billing: "subscription",
    executionFingerprint: "profile-remote",
  });
  const qualifications = [qualification(local, "analysis"), qualification(remote, "analysis")];
  const result = recommend({
    workload: { role: "analysis" },
    candidates: [local, remote],
    qualifications,
    excludedCandidateIds: [local.candidateId],
  });
  assert.equal(result.recommendedCandidateId, remote.candidateId);
  assert.ok(result.evaluations.find((item) => item.candidateId === local.candidateId)
    .reasons.some((reason) => reason.code === "EXPLICITLY_EXCLUDED"));
});

test("matches the pinned donor selector for the same projected candidates and qualifications", () => {
  const local = candidate({ tier: "standard" });
  const remote = candidate({
    candidateId: "codex-cli/gpt-5.6-terra",
    provider: "codex-cli",
    model: "gpt-5.6-terra",
    executionClass: "codex-cli",
    locality: "remote",
    billing: "subscription",
    executionFingerprint: "profile-remote",
    tier: "premium",
  });
  const haloCandidates = [remote, local];
  const donorCandidates = haloCandidates.map((value) => toDonorCandidate(value, "analysis"));
  const qualifications = [qualification(remote, "analysis"), qualification(local, "analysis")];
  const direct = selectCandidate({
    candidates: donorCandidates,
    qualifications,
    role: "analysis",
    requiredTier: "economy",
  });
  const adapted = recommend({
    workload: { role: "analysis", requiredTier: "economy" },
    candidates: haloCandidates,
    qualifications,
  });
  assert.equal(adapted.recommendedCandidateId, direct.id);
  assert.match(adapted.explanation, /exact current role qualification passed/i);
  assert.match(adapted.explanation, /free local candidate preferred/i);
});

test("qualified unknown availability remains eligible but known unavailable is excluded", () => {
  const unknown = candidate({ available: null });
  assert.equal(recommend({
    workload: { role: "analysis" },
    candidates: [unknown],
    qualifications: [qualification(unknown, "analysis")],
  }).recommendedCandidateId, unknown.candidateId);

  const unavailable = candidate({ available: false });
  const result = recommend({
    workload: { role: "analysis" },
    candidates: [unavailable],
    qualifications: [qualification(unavailable, "analysis")],
  });
  assert.equal(result.recommendedCandidateId, null);
  assert.ok(result.evaluations[0].reasons.some((reason) => reason.code === "KNOWN_UNAVAILABLE"));
});
