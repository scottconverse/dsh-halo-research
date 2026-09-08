import {
  QUALIFICATION_HARNESSES,
  TIER_RANK,
  candidateFingerprint,
  inferLocalTier,
  selectCandidate,
} from "./vendor/devharmonics/scripts/fleet.mjs";

export {
  QUALIFICATION_HARNESSES,
  TIER_RANK,
  candidateFingerprint,
  inferLocalTier,
  selectCandidate,
};

export const DSH_RUNTIME_VERSION = "DSH/0.1.1-rc.2";

/**
 * Thin Halo-to-DevHarmonics projection. The execution-profile fingerprint is
 * carried as the donor digest, so donor qualification becomes stale whenever
 * any field in Halo's current execution profile changes.
 */
export function toDonorCandidate(candidate, role) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("candidate must be an object");
  }
  if (role !== undefined && !(role in QUALIFICATION_HARNESSES)) {
    throw new Error(`Unknown qualification role: ${role}`);
  }
  for (const field of ["candidateId", "provider", "model", "executionFingerprint"]) {
    if (typeof candidate[field] !== "string" || !candidate[field].trim()) {
      throw new TypeError(`candidate.${field} must be a nonempty string`);
    }
  }
  const lane = candidate.lane
    ?? (["lmstudio", "ollama"].includes(candidate.provider) ? "http" : "subprocess");
  const tier = candidate.tier
    ?? (lane === "http" ? inferLocalTier(candidate.model) : "premium");
  if (!(tier in TIER_RANK)) throw new Error(`Unsupported candidate tier: ${tier}`);

  return {
    id: candidate.candidateId,
    lane,
    provider: candidate.provider,
    model: candidate.model,
    tier,
    runtimeVersion: candidate.runtimeVersion ?? DSH_RUNTIME_VERSION,
    digest: candidate.executionFingerprint,
    // The donor's `paid` bit is its local-first lane score, not Halo billing
    // metadata. Preserve explicit Halo locality; an unclassified HTTP lane is
    // the donor's local lane until a supplied `paid` override says otherwise.
    paid: candidate.paid ?? !(candidate.locality === "local"
      || (candidate.locality === "unknown" && lane === "http")),
  };
}

// Visibility-only copy of the pinned donor's private helper. Keep this body in
// lockstep with vendor/devharmonics/scripts/fleet.mjs currentQualification.
export function currentQualification(candidate, qualifications, role) {
  const fingerprint = candidateFingerprint(candidate, role);
  const matching = qualifications.filter((item) =>
    item.candidateId === candidate.id
    && item.role === role
    && item.fingerprint === fingerprint);
  const latest = matching.reduce((selected, item) => {
    if (!selected) return item;
    return String(item.finishedAt ?? "") >= String(selected.finishedAt ?? "") ? item : selected;
  }, null);
  return latest?.passed === true ? latest : null;
}

// Visibility-only copy of the pinned donor's private helper.
export function tierFit(candidateTier, requiredTier) {
  const difference = TIER_RANK[candidateTier] - TIER_RANK[requiredTier];
  return difference < 0 ? null : difference;
}
