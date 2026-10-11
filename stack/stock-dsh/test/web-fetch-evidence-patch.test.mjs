import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {patchWebFetchEvidence,ensureWebFetchEvidencePatch} from '../web-fetch-evidence-patch.mjs';

test('reviewed web_fetch metadata extension is idempotent and keeps the rest of stock source',()=>{
  const result=ensureWebFetchEvidencePatch();
  const patched=fs.readFileSync(result.target,'utf8');
  assert.equal(patchWebFetchEvidence(patched),patched);
  assert.match(patched,/evidenceFile: \{ type: "string" \}/);
  assert.match(patched,/coverage: \{ type: "string" \}/);
  assert.match(patched,/additionalProperties: false/);
  assert.throws(()=>patchWebFetchEvidence('unrecognized source'),/anchor missing/);
});
