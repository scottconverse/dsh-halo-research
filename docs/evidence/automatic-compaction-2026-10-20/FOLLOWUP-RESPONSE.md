Retained task code: **LIME-AUTO-20** (preserved over the spec’s AMBER-LEDGER-64).

Main concern: cursor tokens are unauthenticated `base64url(identity:rev:seq)`. A holder can decode the identity/revision and re-encode a token for another existing `seq` at the same revision; `#decodeCursor` accepts it, allowing skipped records. That is a forged cursor, not merely stale or foreign.

Testing limitations: (1) no cursor tamper/re-encode test, nor an empty-`apply([])` cursor-preservation test; (2) no timestamp boundary tests near year 0000/9999 with large offsets, and no canonical-array tests with extra/non-enumerable properties.

Verified only by reading the supplied spec, implementation, and tests; no execution occurred. Inferred: cursor-tamper acceptance and the timestamp/canonical edge behavior. I did not run tests, access files, or search for hidden tests.