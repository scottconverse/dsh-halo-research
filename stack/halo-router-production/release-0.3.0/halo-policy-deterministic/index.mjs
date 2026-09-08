import {
  QUALIFICATION_HARNESSES,
  TIER_RANK,
  currentQualification,
  selectCandidate,
  tierFit,
  toDonorCandidate,
} from "./donor-adapter.mjs";

export {
  DSH_RUNTIME_VERSION,
  QUALIFICATION_HARNESSES,
  TIER_RANK,
  candidateFingerprint,
  currentQualification,
  inferLocalTier,
  selectCandidate,
  tierFit,
  toDonorCandidate,
} from "./donor-adapter.mjs";

export const name = "dsh-halo-policy-deterministic";
export const inject = Object.freeze(["haloRouting"]);
export const POLICY_ID = name;
export const POLICY_VERSION = "0.2.0";

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

function uniqueStrings(value, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new TypeError(`${field} must be an array of nonempty strings`);
  }
  return [...new Set(value)];
}

function normalizePolicyConfig(config = {}) {
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    throw new TypeError("policy config must be an object");
  }
  if (config.preferLocal !== undefined && config.preferLocal !== true) {
    throw new TypeError("policy.preferLocal cannot disable the pinned donor's free-local-first selector");
  }
  return Object.freeze({
    excludedCandidateIds: Object.freeze(uniqueStrings(config.excludedCandidateIds, "policy.excludedCandidateIds")),
  });
}

function validateWorkload(workload) {
  if (workload === null || typeof workload !== "object" || Array.isArray(workload)) {
    throw new TypeError("workload must be an object");
  }
  assertNonemptyString(workload.role, "workload.role");
  if (!(workload.role in QUALIFICATION_HARNESSES)) {
    throw new TypeError(`Unknown qualification role: ${workload.role}`);
  }
  uniqueStrings(workload.requiredCapabilities, "workload.requiredCapabilities");
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
  for (const field of ["candidateId", "provider", "model"]) {
    assertNonemptyString(candidate[field], `candidates[${index}].${field}`);
  }
  if (candidate.available !== undefined && candidate.available !== null
    && typeof candidate.available !== "boolean") {
    throw new TypeError(`candidates[${index}].available must be boolean, null, or omitted`);
  }
  if (candidate.capabilities !== undefined) {
    uniqueStrings(candidate.capabilities, `candidates[${index}].capabilities`);
  }
  if (candidate.tier !== undefined && !(candidate.tier in TIER_RANK)) {
    throw new TypeError(`Unsupported candidates[${index}].tier: ${candidate.tier}`);
  }
  if (candidate.contextWindow !== undefined
    && (!Number.isSafeInteger(candidate.contextWindow) || candidate.contextWindow <= 0)) {
    throw new TypeError(`candidates[${index}].contextWindow must be a positive safe integer`);
  }
}

function validateQualifications(qualifications) {
  if (!Array.isArray(qualifications)) throw new TypeError("qualifications must be an array");
  qualifications.forEach((record, index) => {
    if (record === null || typeof record !== "object" || Array.isArray(record)) {
      throw new TypeError(`qualifications[${index}] must be an object`);
    }
  });
}

function reason(code, kind, message) {
  return { code, kind, message };
}

function candidateEvaluation(candidate, donor, workload, qualifications, explicitlyExcluded) {
  const reasons = [];
  let rejected = false;
  const reject = (code, message) => {
    rejected = true;
    reasons.push(reason(code, "reject", message));
  };
  const support = (code, message) => reasons.push(reason(code, "support", message));
  const caveat = (code, message) => reasons.push(reason(code, "caveat", message));

  if (!donor) {
    reject("EXECUTION_FINGERPRINT_MISSING", "No current execution-profile fingerprint is available for donor qualification.");
  }
  if (explicitlyExcluded) reject("EXPLICITLY_EXCLUDED", "The caller excluded this candidate from this recommendation.");
  if (candidate.available === false) {
    reject("KNOWN_UNAVAILABLE", "The supplied snapshot proves the candidate unavailable.");
  } else if (candidate.available !== true) {
    caveat("AVAILABILITY_UNKNOWN", "Current availability is unknown; donor qualification remains the admission gate.");
  } else {
    support("AVAILABLE", "The supplied snapshot reports the candidate available.");
  }

  const catalogState = String(candidate.catalogState ?? "unknown").toLowerCase();
  if (CATALOG_REJECTIONS.has(catalogState)) {
    reject("CATALOG_UNAVAILABLE", `Catalog state '${catalogState}' excludes the candidate.`);
  }

  const requiredCapabilities = uniqueStrings(workload.requiredCapabilities, "workload.requiredCapabilities").sort();
  const capabilities = new Set(candidate.capabilities ?? []);
  const capabilitiesObserved = candidate.inputModalitiesState === "observed"
    || candidate.capabilityState === "observed"
    || capabilities.size > 0;
  const missing = requiredCapabilities.filter((item) => !capabilities.has(item));
  if (capabilitiesObserved && missing.length > 0) {
    reject("CAPABILITY_MISSING", `Missing required capabilities: ${missing.join(", ")}.`);
  } else if (!capabilitiesObserved && requiredCapabilities.length > 0) {
    caveat("CAPABILITIES_UNKNOWN", "Capability metadata is unknown; exact role qualification remains authoritative.");
  }

  if (workload.requiredContextWindow !== undefined && candidate.contextWindow !== undefined
    && candidate.contextWindow < workload.requiredContextWindow) {
    reject("CONTEXT_TOO_SMALL", `Context window ${candidate.contextWindow} is below ${workload.requiredContextWindow}.`);
  }

  if (donor) {
    const requiredTier = workload.requiredTier ?? "economy";
    const fit = tierFit(donor.tier, requiredTier);
    if (fit === null) reject("TIER_TOO_LOW", `${donor.tier} tier is below required ${requiredTier}.`);
    else support("TIER_SATISFIED", `${donor.tier} tier satisfies ${requiredTier}.`);

    const currentRole = currentQualification(donor, qualifications, workload.role);
    if (!currentRole) {
      reject("QUALIFICATION_NOT_CURRENT", `No current exact-fingerprint PASS exists for role '${workload.role}'.`);
    } else {
      support("QUALIFICATION_PASSED", `Exact current qualification for role '${workload.role}' passed.`);
    }
    if (workload.role === "structured_write") {
      const benchmark = currentQualification(donor, qualifications, "benchmark");
      if (!benchmark) reject("BENCHMARK_NOT_CURRENT", "No current exact-fingerprint benchmark PASS exists.");
      else support("BENCHMARK_PASSED", "Exact current benchmark qualification passed.");
    }
  }

  return {
    candidateId: candidate.candidateId,
    provider: candidate.provider,
    model: candidate.model,
    executionClass: candidate.executionClass,
    locality: candidate.locality,
    billing: candidate.billing,
    decision: rejected ? "rejected" : "accepted",
    reasons,
  };
}

function donorRanking({ candidates, qualifications, role, requiredTier, excludedCandidateIds }) {
  const ranked = [];
  const excluded = new Set(excludedCandidateIds);
  while (true) {
    let selected;
    try {
      selected = selectCandidate({
        candidates,
        qualifications,
        role,
        requiredTier,
        excludedCandidateIds: [...excluded],
      });
    } catch (error) {
      if (/^No currently qualified candidate can perform /.test(error?.message ?? "")) break;
      throw error;
    }
    ranked.push(selected);
    excluded.add(selected.id);
  }
  return ranked;
}

export function recommend({
  workload,
  candidates,
  qualifications = [],
  excludedCandidateIds = [],
  policy = {},
} = {}) {
  validateWorkload(workload);
  if (!Array.isArray(candidates)) throw new TypeError("candidates must be an array");
  validateQualifications(qualifications);
  const normalizedPolicy = normalizePolicyConfig(policy);
  const explicitExclusions = new Set([
    ...uniqueStrings(excludedCandidateIds, "excludedCandidateIds"),
    ...normalizedPolicy.excludedCandidateIds,
  ]);
  const byId = new Map();
  const donorById = new Map();
  candidates.forEach((candidate, index) => {
    validateCandidate(candidate, index);
    if (byId.has(candidate.candidateId)) throw new TypeError(`Duplicate candidateId: ${candidate.candidateId}`);
    byId.set(candidate.candidateId, candidate);
    if (typeof candidate.executionFingerprint === "string" && candidate.executionFingerprint.trim()) {
      donorById.set(candidate.candidateId, toDonorCandidate(candidate, workload.role));
    }
  });

  const evaluations = [...candidates]
    .sort((left, right) => left.candidateId.localeCompare(right.candidateId))
    .map((candidate) => candidateEvaluation(
    candidate,
    donorById.get(candidate.candidateId),
    workload,
    qualifications,
    explicitExclusions.has(candidate.candidateId),
    ));
  const hardExcluded = evaluations
    .filter((evaluation) => evaluation.reasons.some((item) => [
      "EXECUTION_FINGERPRINT_MISSING",
      "EXPLICITLY_EXCLUDED",
      "KNOWN_UNAVAILABLE",
      "CATALOG_UNAVAILABLE",
      "CAPABILITY_MISSING",
      "CONTEXT_TOO_SMALL",
    ].includes(item.code)))
    .map((evaluation) => evaluation.candidateId);
  const ranked = donorRanking({
    candidates: [...donorById.values()],
    qualifications,
    role: workload.role,
    requiredTier: workload.requiredTier ?? "economy",
    excludedCandidateIds: [...hardExcluded, ...explicitExclusions],
  });
  const rankById = new Map(ranked.map((candidate, index) => [candidate.id, index]));
  for (const evaluation of evaluations) {
    if (!rankById.has(evaluation.candidateId)) {
      evaluation.decision = "rejected";
      continue;
    }
    evaluation.decision = "accepted";
    const rank = rankById.get(evaluation.candidateId);
    evaluation.rank = rank + 1;
    if (rank === 0) {
      for (const factor of ranked[0].factors) {
        evaluation.reasons.push(reason("DONOR_SELECTED_FACTOR", "support", factor));
      }
    } else {
      evaluation.reasons.push(reason(
        "DONOR_RANKED_BELOW",
        "support",
        `The pinned donor selector ranked this candidate below ${ranked[0].id}.`,
      ));
    }
  }

  const selected = ranked[0] ?? null;
  const explanation = selected
    ? `Recommend ${selected.id}. ${selected.factors.join("; ")}. This shadow-only recommendation changes no route.`
    : "No currently qualified candidate satisfies the donor role, benchmark, tier, and exclusion gates. This shadow-only result changes no route.";

  return {
    recommendedCandidateId: selected?.id ?? null,
    acceptedCandidateIds: ranked.map((candidate) => candidate.id),
    rejectedCandidateIds: evaluations
      .filter((evaluation) => evaluation.decision === "rejected")
      .map((evaluation) => evaluation.candidateId),
    evaluations,
    explanation,
  };
}

export function apply(ctx, config = {}) {
  const normalizedConfig = normalizePolicyConfig(config);
  return ctx.haloRouting.registerPolicy(Object.freeze({
    id: POLICY_ID,
    version: POLICY_VERSION,
    authority: "none",
    config: normalizedConfig,
    recommend: (request) => recommend({ ...request, policy: normalizedConfig }),
  }));
}
