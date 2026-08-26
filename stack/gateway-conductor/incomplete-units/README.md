# Incomplete units - best preserved implementations

These two units did not reach green overnight. Each file here is the furthest
that unit got, kept so the next session resumes instead of restarting.

- `security.BEST-9of11.py` -> `src\halo_research_gateway\security.py`
  9 of 11 frozen tests pass. Remaining: a public IPv6 literal
  (`https://[2606:4700::1]/`) is wrongly rejected by the single-label
  hostname rule, and at least one obfuscated loopback form (decimal/hex/octal
  IPv4) is not recognised as an IP literal. Both are fixed by resolving the
  host to an address BEFORE applying hostname rules - see
  `briefs\B3-security-final.md`, which contains the exact helper to add.
  NOTE: the worker broke this module with import errors on two separate
  attempts at that edit. Try the 27B cockpit lane (`-Lane cockpit`) or split
  the change into two even smaller steps.

- `envelope.BEST-9of11.py` -> `src\halo_research_gateway\envelope.py`
  9 of 11 frozen tests pass. Remaining: both failures are the character
  budget - `page.serialized_chars` must equal `len(json.dumps(envelope))`
  exactly AND stay within `char_budget`, which needs a fixed-point
  re-measure because writing the number changes the document length. See
  `briefs\B8-envelope-final.md`.

To resume: copy the file into the repo, confirm the pass count with the unit's
pytest command, then dispatch via Halo-Code.ps1 with the matching brief.
