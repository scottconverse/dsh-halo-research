import assert from "node:assert/strict";
import test from "node:test";

import {
  candidateFingerprint as devFingerprint,
  selectCandidate as devSelect,
} from "../vendor/devharmonics/scripts/fleet.mjs";
import {
  candidateFingerprint as factoryFingerprint,
  selectCandidate as factorySelect,
} from "../vendor/codex-factory/scripts/factory-fleet.mjs";

function candidates() {
  return [
    {
      id: "local:model-30b",
      lane: "http",
      provider: "ollama",
      model: "model-30b",
      runtimeVersion: "runtime-1",
      adapterVersion: "adapter-1",
      capabilities: ["completion", "tools"],
      digest: "profile-local",
      tier: "standard",
      reasoningEffort: "low",
      paid: false,
    },
    {
      id: "remote:model-premium",
      lane: "subprocess",
      provider: "openai",
      model: "model-premium",
      runtimeVersion: "runtime-1",
      adapterVersion: "adapter-1",
      capabilities: ["completion", "tools"],
      digest: "profile-remote",
      tier: "premium",
      reasoningEffort: "high",
      paid: true,
    },
  ];
}

function qualification(value, role, fingerprint, passed = true, finishedAt = "2026-09-07T00:00:00.000Z") {
  return { candidateId: value.id, role, fingerprint: fingerprint(value, role), passed, finishedAt };
}

function qualifications(values, fingerprint, roles = ["analysis"]) {
  return values.flatMap((value) => roles.map((role) => qualification(value, role, fingerprint)));
}

function selectBoth({ role = "analysis", requiredTier = "economy", excludedCandidateIds = [], roles = [role] } = {}) {
  const values = candidates();
  const dev = devSelect({
    candidates: values,
    qualifications: qualifications(values, devFingerprint, roles),
    role,
    requiredTier,
    excludedCandidateIds,
  });
  const factory = factorySelect({
    candidates: values,
    qualifications: qualifications(values, factoryFingerprint, roles),
    role,
    requiredTier,
    excludedCandidateIds,
  });
  return { dev, factory };
}

test("DevHarmonics and Factory choose the same local-first candidate on their common contract", () => {
  const { dev, factory } = selectBoth();
  assert.equal(dev.id, factory.id);
  assert.deepEqual(dev.factors, factory.factors);
});

test("DevHarmonics and Factory forward the same exclusion and tier decisions", () => {
  const excluded = selectBoth({ excludedCandidateIds: ["local:model-30b"] });
  assert.equal(excluded.dev.id, "remote:model-premium");
  assert.equal(excluded.dev.id, excluded.factory.id);

  const premium = selectBoth({ requiredTier: "premium" });
  assert.equal(premium.dev.id, "remote:model-premium");
  assert.equal(premium.dev.id, premium.factory.id);
});

test("DevHarmonics and Factory both apply the structured-write benchmark gate", () => {
  for (const [select, fingerprint] of [[devSelect, devFingerprint], [factorySelect, factoryFingerprint]]) {
    const values = candidates();
    assert.throws(() => select({
      candidates: values,
      qualifications: qualifications(values, fingerprint, ["structured_write"]),
      role: "structured_write",
    }), /No currently qualified candidate/);
  }
  const { dev, factory } = selectBoth({
    role: "structured_write",
    roles: ["structured_write", "benchmark"],
  });
  assert.equal(dev.id, factory.id);
});

test("both lineages reject a latest exact failure; fingerprint byte equality is intentionally not claimed", () => {
  for (const [select, fingerprint] of [[devSelect, devFingerprint], [factorySelect, factoryFingerprint]]) {
    const value = candidates()[0];
    assert.throws(() => select({
      candidates: [value],
      qualifications: [
        qualification(value, "analysis", fingerprint, true, "2026-09-07T00:00:00.000Z"),
        qualification(value, "analysis", fingerprint, false, "2026-09-07T00:01:00.000Z"),
      ],
      role: "analysis",
    }), /No currently qualified candidate/);
  }
  const value = candidates()[0];
  assert.notEqual(devFingerprint(value, "analysis"), factoryFingerprint(value, "analysis"));
});
