import assert from "node:assert/strict";
import test from "node:test";

import {
  POLICY_ID,
  POLICY_VERSION,
  apply,
  candidateFingerprint,
  inject,
  name,
  recommend,
  toDonorCandidate,
} from "../index.mjs";

function candidate(overrides = {}) {
  return {
    candidateId: "local:model-a",
    provider: "lmstudio",
    model: "model-a",
    executionClass: "ctx.llm",
    locality: "local",
    billing: "free",
    available: true,
    catalogState: "available",
    contextWindow: 32_768,
    capabilities: ["completion", "tools"],
    tier: "standard",
    qualificationState: "pass",
    executionFingerprint: "execution-profile-a",
    ...overrides,
  };
}

function qualify(value, role = "analysis", passed = true, finishedAt = "2026-09-07T00:00:00.000Z") {
  const donor = toDonorCandidate(value, role);
  return {
    candidateId: donor.id,
    fingerprint: candidateFingerprint(donor, role),
    role,
    passed,
    finishedAt,
  };
}

test("recommends a capable local candidate without route authority", () => {
  const value = candidate();
  const result = recommend({
    workload: {
      role: "analysis",
      requiredCapabilities: ["completion"],
      requiredTier: "economy",
      requiredContextWindow: 8_192,
    },
    candidates: [value],
    qualifications: [qualify(value)],
  });

  assert.equal(result.recommendedCandidateId, "local:model-a");
  assert.deepEqual(result.acceptedCandidateIds, ["local:model-a"]);
  assert.deepEqual(result.rejectedCandidateIds, []);
  assert.equal(result.evaluations.length, 1);
  assert.equal(result.evaluations[0].decision, "accepted");
  assert.match(result.explanation, /recommend/i);
  assert.equal(Object.hasOwn(result, "route"), false);
});

test("prefers local execution independently of billing and input order", () => {
  const localPaid = candidate({ candidateId: "z-local-paid", billing: "paid" });
  const remoteFree = candidate({
    candidateId: "a-remote-free",
    provider: "codex",
    model: "remote-model",
    executionClass: "native-cli",
    locality: "remote",
    billing: "free",
  });
  const request = {
    workload: { role: "analysis", requiredCapabilities: ["completion"] },
    candidates: [remoteFree, localPaid],
    qualifications: [qualify(remoteFree), qualify(localPaid)],
  };

  const forward = recommend(request);
  const reverse = recommend({ ...request, candidates: [...request.candidates].reverse() });

  assert.equal(forward.recommendedCandidateId, "z-local-paid");
  assert.deepEqual(forward, reverse);
  assert.ok(forward.evaluations.find((item) => item.candidateId === "z-local-paid")
    .reasons.some((reason) => reason.code === "DONOR_SELECTED_FACTOR"
      && /free local candidate preferred/i.test(reason.message)));
});

test("keeps unknown availability, context, and entitlement non-gating after exact donor qualification", () => {
  const value = candidate({
    available: null,
    catalogState: "unknown",
    contextWindow: undefined,
    tier: "premium",
    qualificationState: "unknown",
  });
  const result = recommend({
    workload: {
      role: "structured_write",
      requiredCapabilities: ["completion"],
      requiredTier: "premium",
      requiredContextWindow: 65_536,
    },
    candidates: [value],
    qualifications: [qualify(value, "structured_write"), qualify(value, "benchmark")],
  });

  assert.equal(result.recommendedCandidateId, "local:model-a");
  const codes = result.evaluations[0].reasons.map((reason) => reason.code);
  assert.ok(codes.includes("AVAILABILITY_UNKNOWN"));
  assert.ok(codes.includes("QUALIFICATION_PASSED"));
  assert.ok(codes.includes("BENCHMARK_PASSED"));
});

test("does not let registered catalog membership replace exact donor qualification", () => {
  const value = candidate({
    available: null,
    catalogState: "registered",
    qualificationState: "unknown",
  });
  const result = recommend({
    workload: { role: "analysis" },
    candidates: [value],
    qualifications: [qualify(value)],
  });

  assert.equal(result.recommendedCandidateId, "local:model-a");
  assert.equal(result.evaluations[0].decision, "accepted");
});

test("accepts subscription billing as distinct from local and marginal paid cost", () => {
  const value = candidate({
    candidateId: "codex-cli/subscription-model",
    provider: "codex-cli",
    model: "subscription-model",
    executionClass: "codex-cli",
    locality: "remote",
    billing: "subscription",
  });
  const result = recommend({
    workload: { role: "analysis" },
    candidates: [value],
    qualifications: [qualify(value)],
  });

  assert.equal(result.recommendedCandidateId, "codex-cli/subscription-model");
  assert.match(result.explanation, /metered candidate selected/i);
});

test("rejects only proven constraint failures and returns reasons for every candidate", () => {
  const candidates = [
    candidate({ candidateId: "qualification-fail", qualificationState: "fail" }),
    candidate({ candidateId: "known-unavailable", available: false }),
    candidate({ candidateId: "catalog-only", catalogState: "catalog-only" }),
    candidate({ candidateId: "missing-capability", capabilities: ["completion"] }),
    candidate({ candidateId: "tier-too-low", tier: "economy" }),
    candidate({ candidateId: "context-too-small", contextWindow: 4_096 }),
  ];
  const result = recommend({
    workload: {
      role: "structured_write",
      requiredCapabilities: ["completion", "tools"],
      requiredTier: "standard",
      requiredContextWindow: 8_192,
    },
    candidates,
    qualifications: candidates.flatMap((value) => value.candidateId === "qualification-fail"
      ? [qualify(value, "structured_write", false), qualify(value, "benchmark")]
      : [qualify(value, "structured_write"), qualify(value, "benchmark")]),
  });

  assert.equal(result.recommendedCandidateId, null);
  assert.deepEqual(result.acceptedCandidateIds, []);
  assert.deepEqual(result.rejectedCandidateIds, candidates.map((item) => item.candidateId).sort());
  assert.equal(result.evaluations.length, candidates.length);
  const codesById = Object.fromEntries(result.evaluations.map((item) => [
    item.candidateId,
    item.reasons.map((reason) => reason.code),
  ]));
  assert.ok(codesById["qualification-fail"].includes("QUALIFICATION_NOT_CURRENT"));
  assert.ok(codesById["known-unavailable"].includes("KNOWN_UNAVAILABLE"));
  assert.ok(codesById["catalog-only"].includes("CATALOG_UNAVAILABLE"));
  assert.ok(codesById["missing-capability"].includes("CAPABILITY_MISSING"));
  assert.ok(codesById["tier-too-low"].includes("TIER_TOO_LOW"));
  assert.ok(codesById["context-too-small"].includes("CONTEXT_TOO_SMALL"));
});

test("uses the donor's tightest tier fit after free-local score", () => {
  const candidates = [
    candidate({ candidateId: "a-standard", tier: "standard" }),
    candidate({ candidateId: "z-economy", tier: "economy" }),
  ];
  const result = recommend({
    workload: { role: "analysis", requiredTier: "economy" },
    candidates,
    qualifications: candidates.map((value) => qualify(value)),
  });

  assert.equal(result.recommendedCandidateId, "z-economy");
  assert.deepEqual(result.acceptedCandidateIds, ["z-economy", "a-standard"]);
});

test("does not mutate inputs or echo prompt content and rejects duplicate identities", () => {
  const inputCandidate = Object.freeze(candidate());
  const workload = Object.freeze({
    role: "analysis",
    prompt: "DO NOT COPY THIS PROMPT",
    toolArguments: Object.freeze({ secret: "DO NOT COPY THIS ARGUMENT" }),
  });
  const request = Object.freeze({ workload, candidates: Object.freeze([inputCandidate]) });

  const result = recommend({ ...request, qualifications: [qualify(inputCandidate)] });

  assert.doesNotMatch(JSON.stringify(result), /DO NOT COPY/);
  assert.throws(() => recommend({
    workload: { role: "analysis" },
    candidates: [inputCandidate, inputCandidate],
  }), /duplicate candidateId/i);
});

test("registers one authority-free policy through haloRouting", () => {
  let registered;
  const disposable = Symbol("disposable");
  const ctx = new Proxy({
    haloRouting: {
      registerPolicy(policy) {
        registered = policy;
        return disposable;
      },
    },
  }, {
    get(target, property) {
      if (property !== "haloRouting") throw new Error(`Unexpected ctx access: ${String(property)}`);
      return target[property];
    },
  });

  const returned = apply(ctx);

  assert.equal(name, "dsh-halo-policy-deterministic");
  assert.deepEqual(inject, ["haloRouting"]);
  assert.equal(returned, disposable);
  assert.equal(registered.id, POLICY_ID);
  assert.equal(registered.version, POLICY_VERSION);
  assert.deepEqual(registered.config, { excludedCandidateIds: [] });
  assert.equal(registered.authority, "none");
  const local = candidate({ candidateId: "z-local" });
  const remote = candidate({ candidateId: "a-remote", locality: "remote", billing: "subscription" });
  assert.equal(registered.recommend({
    workload: { role: "analysis" },
    candidates: [local, remote],
    qualifications: [qualify(local), qualify(remote)],
  }).recommendedCandidateId, "z-local");
});
