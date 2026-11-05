# Web and Desktop rc.5 merge — November 4, 2026

[PR #2](https://github.com/scottconverse/dsh-halo-research/pull/2) combines the completed Web and Desktop update changes into master. The accepted update commits are eea9619d (launcher/readiness), 03808791 and 08b4711f (Web rc.5 and rollback notes), and d1445656 (Desktop rc.5 and visible acceptance).

Integration was prepared in a separate checkout. The only merge conflict was the top of docs/HISTORY.md; both the update entries and the existing complete-Windows-installer entry were retained. The complete Windows installer, its v0.3.13 publication and the other changes already merged on master remain intact. The PR records the final merge commit and status.

The previously recorded Web and Desktop verification was reused, including Desktop's disclosed default-model serialization limitation. No tests, builds, model calls, UI actions or service restarts were performed for this merge. No new release artifacts or tags were requested. Merging repository history does not install the unrelated master changes into the live workstation checkout.

The live profiles and existing triad state are preserved. Strata remains off. Private update receipts, rollback trees and the Halo Stack Research recovery files remain in place. The operation record is under Documents/Codex/2026-11-04/dsh-rc5-merge; it contains before/after preservation hashes and the GitHub merge receipt. No credentials or private session dumps are published.