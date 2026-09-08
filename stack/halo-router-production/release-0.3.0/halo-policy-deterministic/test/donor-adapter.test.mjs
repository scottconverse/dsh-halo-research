import assert from "node:assert/strict";
import test from "node:test";

import * as policy from "../index.mjs";

test("exports the pinned donor selector and Halo projection adapter", () => {
  for (const name of [
    "candidateFingerprint",
    "currentQualification",
    "tierFit",
    "selectCandidate",
    "toDonorCandidate",
  ]) {
    assert.equal(typeof policy[name], "function", `${name} must be a public function`);
  }
});
