export const name = "dsh-halo-policy-deterministic";
export const inject = Object.freeze(["haloRouting"]);
export const POLICY_ID = name;
export const POLICY_VERSION = "0.1.0";

const TIER_RANK = Object.freeze({ economy: 1, standard: 2, premium: 3 });
const LOCALITIES = new Set(["local", "remote", "unknown"]);
const BILLING_STATES = new Set(["free", "paid", "subscription", "unknown"]);
const QUALIFICATION_STATES = new Set(["unknown", "pass", "fail"]);
const CATALOG_REJECTIONS = new Set([
  "catalog-only",
  "configured-unavailable",
  "known-unavailable",
  "not-entitled",
  "unavailable",
]);

function assertNonemptyString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a nonempty string`);
  }
}

function normalizePolicyConfig(config = {}) {
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    throw new TypeError("policy config must be an object");
  }
  if (config.preferLocal !== undefined && typeof config.preferLocal !== "boolean") {
    throw new TypeError("policy.preferLocal must be a boolean when supplied");
  }
  return Object.freeze({ preferLocal: config.preferLocal ?? true });
}

function validateWorkload(workload) {
  if (workload === null || typeof workload !== "object" || Array.isArray(workload)) {
    throw new TypeError("workload must be an object");
  }
  assertNonemptyString(workload.role, "workload.role");
  if (workload.requiredCapabilities !== undefined
    && (!Array.isArray(workload.requiredCapabilities)
      || workload.requiredCapabilities.some((item) => typeof item !== "string" || !item.trim()))) {
    throw new TypeError("workload.requiredCapabilities must be an array of nonempty strings");
  }
  if (workload.requiredTier !== undefined && !(workload.requiredTier in TIER_RANK)) {
    throw new TypeError(`Unsupported workload.requiredTier: ${workload.requiredTier}`);
  }
  if (workload.requiredContextWindow !== undefined
    && (!Number.isSafeInteger(workload.requiredContextWindow) || workload.requiredContextWindow <= 0)) {
    throw new TypeError("workload.requiredContextWindow must be a positive safe integer");
  }
}

function validateCandidate(candidate, index) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError(`candidates[${index}] must be an object`);
  }
  for (const field of ["candidateId", "provider", "model", "executionClass", "catalogState"]) {
    assertNonemptyString(candidate[field], `candidates[${index}].${field}`);
  }
  if (!LOCALITIES.has(candidate.locality)) {
    throw new TypeError(`Unsupported candidates[${index}].locality: ${candidate.locality}`);
  }
  if (!BILLING_STATES.has(candidate.billing)) {
    throw new TypeError(`Unsupported candidates[${index}].billing: ${candidate.billing}`);
  }
  if (candidate.available !== null && typeof candidate.available !== "boolean") {
    throw new TypeError(`candidates[${index}].available must be boolean or null`);
  }
  if (!Array.isArray(candidate.capabilities)
    || candidate.capabilities.some((item) => typeof item !== "string" || !item.trim())) {
    throw new TypeError(`candidates[${index}].capabilities must be an array of nonempty strings`);
  }
  if (candidate.tier !== undefined && !(candidate.tier in TIER_RANK)) {
    throw new TypeError(`Unsupported candidates[${index}].tier: ${candidate.tier}`);
  }
  if (candidate.contextWindow !== undefined
    && (!Number.isSafeInteger(candidate.contextWindow) || candidate.contextWindow <= 0)) {
    throw new TypeError(`candidates[${index}].contextWindow must be a positive safe integer`);
  }
  if (!QUALIFICATION_STATES.has(candidate.qualificationState)) {
    throw new TypeError(`Unsupported candidates[${index}].qualificationState: ${candidate.qualificationState}`);
  }
}

function makeReason(code, kind, message) {
  return { code, kind, message };
}

function evaluateCandidate(candidate, workload) {
  const reasons = [];
  let rejected = false;
  const reject = (code, message) => {
    rejected = true;
    reasons.push(makeReason(code, "reject", message));
  };
  const support = (code, message) => reasons.push(makeReason(code, "support", message));
  const caveat = (code, message) => reasons.push(makeReason(code, "caveat", message));

  if (candidate.available === false) {
    reject("KNOWN_UNAVAILABLE", "The candidate is known to be unavailable.");
  } else if (candidate.available === null) {
    caveat("AVAILABILITY_UNKNOWN", "Current availability is unknown and is non-gating in shadow.");
  } else {
    support("AVAILABLE", "The supplied snapshot reports the candidate available.");
  }

  const catalogState = candidate.catalogState.toLowerCase();
  if (catalogState === "catalog-only") {
    reject("CATALOG_ONLY", "Catalog membership does not prove entitlement or executable access.");
  } else if (CATALOG_REJECTIONS.has(catalogState)) {
    reject("CATALOG_UNAVAILABLE", `Catalog state '${candidate.catalogState}' proves the candidate unavailable.`);
  } else if (catalogState === "unknown" || catalogState === "registered") {
    const membershipNote = catalogState === "registered"
      ? " Catalog registration alone does not prove executable access."
      : "";
    caveat(
      "ENTITLEMENT_UNKNOWN",
      `Authentication, quota, or entitlement is unknown and is non-gating in shadow.${membershipNote}`,
    );
  } else if (catalogState === "available") {
    support("CATALOG_AVAILABLE", "The supplied catalog state reports executable access.");
  } else {
    caveat(
      "CATALOG_STATE_UNRECOGNIZED",
      `Catalog state '${candidate.catalogState}' is not recognized and is non-gating in shadow.`,
    );
  }

  const requiredCapabilities = [...new Set(workload.requiredCapabilities ?? [])].sort();
  const capabilities = new Set(candidate.capabilities);
  const missingCapabilities = requiredCapabilities.filter((required) => !capabilities.has(required));
  if (missingCapabilities.length > 0) {
    reject("CAPABILITY_MISSING", `Missing required capabilities: ${missingCapabilities.join(", ")}.`);
  } else if (requiredCapabilities.length > 0) {
    support("CAPABILITIES_SATISFIED", `Required capabilities are present: ${requiredCapabilities.join(", ")}.`);
  } else {
    support("NO_CAPABILITY_REQUIREMENT", "The workload declares no capability constraint.");
  }

  let tierFit = 0;
  if (workload.requiredTier !== undefined) {
    if (candidate.tier === undefined) {
      tierFit = Number.POSITIVE_INFINITY;
      caveat("TIER_UNKNOWN", `Tier is unknown; the ${workload.requiredTier} requirement is not disproven.`);
    } else {
      tierFit = TIER_RANK[candidate.tier] - TIER_RANK[workload.requiredTier];
      if (tierFit < 0) {
        reject("TIER_TOO_LOW", `${candidate.tier} tier is below required ${workload.requiredTier}.`);
      } else {
        support("TIER_SATISFIED", `${candidate.tier} tier satisfies required ${workload.requiredTier}.`);
      }
    }
  } else if (candidate.tier === undefined) {
    caveat("TIER_UNKNOWN", "Tier is unknown, and the workload declares no tier requirement.");
  } else {
    support("TIER_RECORDED", `Candidate tier is ${candidate.tier}; the workload declares no tier requirement.`);
  }

  if (workload.requiredContextWindow !== undefined) {
    if (candidate.contextWindow === undefined) {
      caveat(
        "CONTEXT_UNKNOWN",
        `Context window is unknown; the ${workload.requiredContextWindow} requirement is not disproven.`,
      );
    } else if (candidate.contextWindow < workload.requiredContextWindow) {
      reject(
        "CONTEXT_TOO_SMALL",
        `Context window ${candidate.contextWindow} is below required ${workload.requiredContextWindow}.`,
      );
    } else {
      support(
        "CONTEXT_SATISFIED",
        `Context window ${candidate.contextWindow} satisfies required ${workload.requiredContextWindow}.`,
      );
    }
  } else if (candidate.contextWindow === undefined) {
    caveat("CONTEXT_UNKNOWN", "Context window is unknown, and the workload declares no context requirement.");
  } else {
    support("CONTEXT_RECORDED", `Candidate context window is ${candidate.contextWindow}.`);
  }

  if (candidate.qualificationState === "fail") {
    reject("QUALIFICATION_FAILED", `Qualification for role '${workload.role}' explicitly failed.`);
  } else if (candidate.qualificationState === "unknown") {
    caveat(
      "QUALIFICATION_UNKNOWN",
      `Candidate has never been qualified for role '${workload.role}'; unknown is non-gating in shadow only.`,
    );
  } else {
    support("QUALIFICATION_PASSED", `Qualification for role '${workload.role}' passed.`);
  }

  if (candidate.locality === "local") {
    support("LOCAL_EXECUTION", "Execution is explicitly local.");
  } else if (candidate.locality === "remote") {
    support("REMOTE_EXECUTION", "Execution is explicitly remote.");
  } else {
    caveat("LOCALITY_UNKNOWN", "Execution locality is unknown and receives no local preference.");
  }

  const billingCode = {
    free: "BILLING_FREE",
    paid: "BILLING_PAID",
    subscription: "BILLING_SUBSCRIPTION",
    unknown: "BILLING_UNKNOWN",
  }[candidate.billing];
  const billingMessage = candidate.billing === "unknown"
    ? "Billing state is unknown; billing is recorded separately and does not imply locality."
    : candidate.billing === "subscription"
      ? "Billing is subscription-backed; marginal cost is unknown, and billing does not imply locality."
      : `Billing state is ${candidate.billing}; billing is recorded separately and does not imply locality.`;
  const billingKind = ["unknown", "subscription"].includes(candidate.billing) ? "caveat" : "support";
  reasons.push(makeReason(billingCode, billingKind, billingMessage));

  return {
    candidateId: candidate.candidateId,
    provider: candidate.provider,
    model: candidate.model,
    executionClass: candidate.executionClass,
    locality: candidate.locality,
    billing: candidate.billing,
    decision: rejected ? "rejected" : "accepted",
    reasons,
    rank: {
      tierFit: Number.isFinite(tierFit) ? tierFit : null,
      tierKnown: candidate.tier !== undefined,
    },
  };
}

function compareAccepted(left, right, candidatesById, workload, policy) {
  const leftCandidate = candidatesById.get(left.candidateId);
  const rightCandidate = candidatesById.get(right.candidateId);
  if (policy.preferLocal) {
    const localityDifference = (leftCandidate.locality === "local" ? 0 : 1)
      - (rightCandidate.locality === "local" ? 0 : 1);
    if (localityDifference !== 0) return localityDifference;
  }
  if (workload.requiredTier !== undefined) {
    const knownDifference = (leftCandidate.tier === undefined ? 1 : 0)
      - (rightCandidate.tier === undefined ? 1 : 0);
    if (knownDifference !== 0) return knownDifference;
    if (leftCandidate.tier !== undefined && rightCandidate.tier !== undefined) {
      const fitDifference = (TIER_RANK[leftCandidate.tier] - TIER_RANK[workload.requiredTier])
        - (TIER_RANK[rightCandidate.tier] - TIER_RANK[workload.requiredTier]);
      if (fitDifference !== 0) return fitDifference;
    }
  }
  return left.candidateId.localeCompare(right.candidateId);
}

export function recommend({ workload, candidates, policy = {} } = {}) {
  validateWorkload(workload);
  if (!Array.isArray(candidates)) throw new TypeError("candidates must be an array");
  const normalizedPolicy = normalizePolicyConfig(policy);
  const candidatesById = new Map();
  candidates.forEach((candidate, index) => {
    validateCandidate(candidate, index);
    if (candidatesById.has(candidate.candidateId)) {
      throw new TypeError(`Duplicate candidateId: ${candidate.candidateId}`);
    }
    candidatesById.set(candidate.candidateId, candidate);
  });

  const evaluations = [...candidatesById.values()]
    .sort((left, right) => left.candidateId.localeCompare(right.candidateId))
    .map((candidate) => evaluateCandidate(candidate, workload));
  const accepted = evaluations
    .filter((evaluation) => evaluation.decision === "accepted")
    .sort((left, right) => compareAccepted(left, right, candidatesById, workload, normalizedPolicy));
  const rejected = evaluations.filter((evaluation) => evaluation.decision === "rejected");
  const selected = accepted[0] ?? null;

  if (selected) {
    selected.reasons.push(makeReason(
      "RECOMMENDED",
      "support",
      "This candidate ranks first under the deterministic shadow policy.",
    ));
    for (const evaluation of accepted.slice(1)) {
      evaluation.reasons.push(makeReason(
        "RANKED_BELOW_RECOMMENDATION",
        "support",
        `Candidate is eligible but ranks below ${selected.candidateId}.`,
      ));
    }
  }

  const selectedCaveats = selected
    ? selected.reasons.filter((reason) => reason.kind === "caveat").map((reason) => reason.message)
    : [];
  const explanation = selected
    ? `Recommend ${selected.candidateId}. ${selectedCaveats.length > 0 ? `Caveats: ${selectedCaveats.join(" ")} ` : ""}This shadow-only recommendation changes no route.`
    : "No candidate satisfies every proven constraint. This shadow-only result changes no route.";

  return {
    recommendedCandidateId: selected?.candidateId ?? null,
    acceptedCandidateIds: accepted.map((evaluation) => evaluation.candidateId),
    rejectedCandidateIds: rejected.map((evaluation) => evaluation.candidateId),
    evaluations,
    explanation,
  };
}

export function apply(ctx, config = {}) {
  const normalizedConfig = normalizePolicyConfig(config);
  return ctx.haloRouting.registerPolicy(Object.freeze({
    id: POLICY_ID,
    version: POLICY_VERSION,
    config: normalizedConfig,
    recommend: (request) => recommend({ ...request, policy: normalizedConfig }),
  }));
}
