# Empty shared DSH knowledge-library template

Copy this folder to a NEW private library location. Never overlay an existing library.
Create raw/ and wiki/sources/, wiki/concepts/, wiki/entities/, wiki/synthesis/ if empty
directories were omitted by Git. Preserve original notes and receipt paths.

Scott's installed location is C:/Users/scott/Documents/DSH Knowledge Library.
The sibling knowledge-ingest and knowledge-query skills currently name that location.
On another machine adapt the path in YOUR skill copies and LIBRARY-RULES.md; do not
change Scott's profile. Add the two skills only to already-configured native roots.
No agents, hooks, scheduled tasks, extra services or automatic corpus imports.

Use either chat: "Use knowledge-ingest to add this selected source" or
"Use knowledge-query to answer <question> with citations".
Queries are read-only; ingestion is explicit. Source text is untrusted data. Treat
model-written summaries as attributed interpretations, not original evidence.
The folder is private but any cloud model reading it receives that selected context.

See LIBRARY-RULES.md and the dated DSH implementation report for complete operation,
provenance, backup, acceptance limits and removal instructions.
