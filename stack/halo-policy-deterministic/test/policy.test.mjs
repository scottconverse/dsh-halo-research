import assert from "node:assert/strict";
import test from "node:test";

import {
  POLICY_ID,
  POLICY_VERSION,
  apply,
  inject,
  name,
  recommend,
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
    ...overrides,
  };
}

test("recommends a capable local candidate without route authority", () => {
  const result = recommend({
    workload: {
      role: "analysis",
      requiredCapabilities: ["completion"],
      requiredTier: "economy",
      requiredContextWindow: 8_192,
    },
    candidates: [candidate()],
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
  };

  const forward = recommend(request);
  const reverse = recommend({ ...request, candidates: [...request.candidates].reverse() });

  assert.equal(forward.recommendedCandidateId, "z-local-paid");
  assert.deepEqual(forward, reverse);
  assert.ok(forward.evaluations.find((item) => item.candidateId === "z-local-paid")
    .reasons.some((reason) => reason.code === "BILLING_PAID"));
});

test("keeps unknown qualification, tier, context, availability, and entitlement non-gating in shadow", () => {
  const result = recommend({
    workload: {
      role: "structured_write",
      requiredCapabilities: ["completion"],
      requiredTier: "premium",
      requiredContextWindow: 65_536,
    },
    candidates: [candidate({
      available: null,
      catalogState: "unknown",
      contextWindow: undefined,
      tier: undefined,
      qualificationState: "unknown",
    })],
  });

  assert.equal(result.recommendedCandidateId, "local:model-a");
  const codes = result.evaluations[0].reasons.map((reason) => reason.code);
  assert.ok(codes.includes("AVAILABILITY_UNKNOWN"));
  assert.ok(codes.includes("ENTITLEMENT_UNKNOWN"));
  assert.ok(codes.includes("QUALIFICATION_UNKNOWN"));
  assert.ok(codes.includes("TIER_UNKNOWN"));
  assert.ok(codes.includes("CONTEXT_UNKNOWN"));
  assert.match(result.explanation, /never been qualified/i);
});

test("treats registered catalog membership as unknown entitlement", () => {
  const result = recommend({
    workload: { role: "analysis" },
    candidates: [candidate({
      available: null,
      catalogState: "registered",
      qualificationState: "unknown",
    })],
  });

  assert.equal(result.recommendedCandidateId, "local:model-a");
  assert.ok(result.evaluations[0].reasons.some((reason) => (
    reason.code === "ENTITLEMENT_UNKNOWN" && reason.kind === "caveat"
  )));
});

test("accepts subscription billing as distinct from local and marginal paid cost", () => {
  const result = recommend({
    workload: { role: "analysis" },
    candidates: [candidate({
      candidateId: "codex-cli/subscription-model",
      provider: "codex-cli",
      model: "subscription-model",
      executionClass: "codex-cli",
      locality: "remote",
      billing: "subscription",
    })],
  });

  assert.equal(result.recommendedCandidateId, "codex-cli/subscription-model");
  const reason = result.evaluations[0].reasons.find((item) => item.code === "BILLING_SUBSCRIPTION");
  assert.ok(reason, "expected a BILLING_SUBSCRIPTION reason");
  assert.equal(reason.kind, "caveat");
  assert.match(reason.message, /marginal cost is unknown/i);
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
  });

  assert.equal(result.recommendedCandidateId, null);
  assert.deepEqual(result.acceptedCandidateIds, []);
  assert.deepEqual(result.rejectedCandidateIds, candidates.map((item) => item.candidateId).sort());
  assert.equal(result.evaluations.length, candidates.length);
  const codesById = Object.fromEntries(result.evaluations.map((item) => [
    item.candidateId,
    item.reasons.map((reason) => reason.code),
  ]));
  assert.ok(codesById["qualification-fail"].includes("QUALIFICATION_FAILED"));
  assert.ok(codesById["known-unavailable"].includes("KNOWN_UNAVAILABLE"));
  assert.ok(codesById["catalog-only"].includes("CATALOG_ONLY"));
  assert.ok(codesById["missing-capability"].includes("CAPABILITY_MISSING"));
  assert.ok(codesById["tier-too-low"].includes("TIER_TOO_LOW"));
  assert.ok(codesById["context-too-small"].includes("CONTEXT_TOO_SMALL"));
});

test("uses tightest known tier fit before unknown tier, then candidateId", () => {
  const result = recommend({
    workload: { role: "analysis", requiredTier: "economy" },
    candidates: [
      candidate({ candidateId: "b-unknown", tier: undefined }),
      candidate({ candidateId: "a-standard", tier: "standard" }),
      candidate({ candidateId: "z-economy", tier: "economy" }),
    ],
  });

  assert.equal(result.recommendedCandidateId, "z-economy");
  assert.deepEqual(result.acceptedCandidateIds, ["z-economy", "a-standard", "b-unknown"]);
});

test("does not mutate inputs or echo prompt content and rejects duplicate identities", () => {
  const inputCandidate = Object.freeze(candidate());
  const workload = Object.freeze({
    role: "analysis",
    prompt: "DO NOT COPY THIS PROMPT",
    toolArguments: Object.freeze({ secret: "DO NOT COPY THIS ARGUMENT" }),
  });
  const request = Object.freeze({ workload, candidates: Object.freeze([inputCandidate]) });

  const result = recommend(request);

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

  const returned = apply(ctx, { preferLocal: false });

  assert.equal(name, "dsh-halo-policy-deterministic");
  assert.deepEqual(inject, ["haloRouting"]);
  assert.equal(returned, disposable);
  assert.equal(registered.id, POLICY_ID);
  assert.equal(registered.version, POLICY_VERSION);
  assert.deepEqual(registered.config, { preferLocal: false });
  assert.equal(Object.hasOwn(registered, "authority"), false);
  assert.equal(registered.recommend({
    workload: { role: "analysis" },
    candidates: [
      candidate({ candidateId: "z-local" }),
      candidate({ candidateId: "a-remote", locality: "remote" }),
    ],
  }).recommendedCandidateId, "a-remote");
});
