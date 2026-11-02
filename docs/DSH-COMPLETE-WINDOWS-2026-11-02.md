# Complete Windows DSH installer candidate — November 2, 2026

Publication update: Scott authorized merge/tag/publication as v0.3.13. The release
distributes the original ZIP with SHA-256
`78cf4a455da92873671317ed00695e423f26e0a5a217ec7665fe1a2f9676b1e8`
and separate current instructions. No application rebuild or acceptance rerun
was performed. The original verification receipt and the prepublication account
below remain historical; their `releasePublished: false` status describes that
earlier checkpoint. Publication does not resolve the fresh-PC verification limits.

The new additive installer builds a fresh Windows x64 setup with DSH Web,
the actual Electron Desktop, Mission Control, Ollama, Qwen model choices,
DeepSeek 1017 cloud at Low effort, Wigolo, Reddit/Redlib, XERJ, native
Claude Code/Codex connections and the existing released triad fixes.
It does not migrate Halo's sessions, goals, accounts, private search corpus,
LM Studio aliases or downloaded weights. The Halo installation was not changed.

Source and installation instructions: [stack/complete-windows](../stack/complete-windows/README.md).
Machine-readable evidence: [verification.json](evidence/complete-windows-2026-11-02/verification.json).

## Implementation

The bundle explicitly includes public source files and a pinned npm lockfile.
Node, Desktop, Ollama, XERJ and the Reddit package have pinned artifact checksums.
Large archive hashing reads bounded chunks. A package-local native-script
allowlist permits the required native npm builds without changing global npm
settings. This is an online installer; model weights are selected separately.

`Install-DSH.cmd` locates or normally installs PowerShell 7, then runs the setup.
No execution-policy bypass or system policy change is used. Normal Windows
installer elevation, downloaded-script trust controls and required restarts
remain in force. Reddit's pinned parser installer runs in RSS-only setup mode;
its lower Redlib builder then builds the pinned source without starting a
server. The generated receipt says live Reddit usability has not been observed.
Python, Git, Rust MSVC, C++/CMake/LLVM/NASM tools can be provisioned normally.

The destination is a new directory under LOCALAPPDATA. Ownership markers and
candidate-hash checks allow same-candidate recovery without overwriting an
unrelated directory or edited profile. Installation stages have individual
receipts. Launchers record executable, command line, PID and creation time;
stop rejects identity mismatches and preserves recovery receipts.

Both hosts use installation-owned DSH and agents homes. Desktop has its own
Electron user-data directory and its native ephemeral authenticated backend
listener. Web uses 3080; Mission Control uses 3090. The private Ollama service
uses 11435, one resident model and one parallel request. Redlib uses 18080 and
XERJ 9200. A conflicting port causes a refusal, not termination of another
service. The Web shortcut opens Mission Control; `-NoOpen` supports headless
startup. The three new shortcuts live in their own DSH Complete folder.

The official Ollama choices are Qwen3.8 27B, Qwen3.6 35B and Qwen3-Coder 30B,
with bounded 16K context/4K output metadata. They are family equivalents, not
claims of identical quantization to Halo's LM Studio files. DeepSeek's existing
Low/1M context/64K output configuration is retained. Claude/Codex account homes
are separate from existing CLI profiles. Sign-in, model selection and triad
creation are explicit. No model is invoked by installation or model registration.

Mission Control recognizes the private Ollama origin, reads this launcher's
private Web launch log and does not execute LM Studio commands in Ollama-only
mode. Its legacy Halo defaults remain unchanged. New setups do not inherit
the 128 GB Halo fallback as a hardware measurement. The research adapter uses
configured/private Node, Wigolo, Python, parser, Redlib and cache paths. Wigolo
configuration and browser assets are private; XERJ begins with an empty corpus.

## Executed evidence

- Pinned runtime npm installation and required native builds completed, exit 0.
- The original pinned Desktop installer SHA-512 matched. Its signed payload was
  extracted without executing the installer or launching an Electron window.
- Native Web composed-profile readback succeeded. Final isolated Web startup
  completed its normal 303/cookie authentication exchange and returned HTTP 200.
  All nine presets loaded without reported preset errors, including the three
  triad roles. The goals service was present. Shutdown completed with exit 0.
- The actual extracted Desktop backend completed its native IPC startup,
  normal 303/cookie authentication exchange and HTTP 200 response. Native IPC
  shutdown completed with exit 0. This proves backend startup, not observed GUI
  behavior or successful companion/model calls.
- Four focused installer cases passed: isolated model/profile configuration,
  explicit public bundle plus tamper refusal, unsafe paths/corrupt cached
  artifact refusal, and multi-chunk SHA-256/SHA-512 archive hashing.
- The PowerShell ownership regression passed exact identity, executable/time/
  command mismatch, exited-PID handling and receipt retention. Changed scripts
  passed PowerShell parsing.
- Mission Control's affected route-locality case passed legacy LM Studio,
  default Ollama and private-port Ollama classification. Its existing reasoning
  contract passed earlier. The isolated log-rotation case passed after moving
  its temporary fixture to the writable workspace.
- Affected research cases passed installed output-schema validation and RSS to
  configured Redlib fallback. The clean dependency tree uses the explicit schema
  extension rather than relying on a manually patched installed dependency.

No acceptance inference, provider sign-in, model download, real research request,
triad run, current-host restart or current profile/settings edit was performed.
One Codex agent performed this work serially; no subagents were used. The current
session's exact model/effort identity is not independently attested by these
receipts. The model-call counts describe acceptance activity, not the Codex chat.

## Failures and practical limits

An initial isolated Web attempt collided with Halo's already occupied 3080.
Halo was left alone. The verification wrapper's startup-failure path initially
left its own IPC child alive; that exact process was identified and cleaned up.
Later verification used an isolated test port. This exposed and fixed a real
profile defect: Desktop must not inherit Web's fixed port. The earlier Web 401
was a verifier following a token redirect without retaining the cookie; the
normal explicit cookie exchange later passed. It was not an authentication bypass.

Windows PowerShell 5 script execution was blocked in the verification environment.
Setup now uses PowerShell 7 through the normal bootstrap, without changing that
policy. An affected locality regression caused by a free variable was corrected
with an explicit origin argument. An unrelated temporary-file rename denial
was resolved by relocating only that test's fixture; product checks were not weakened.
These failed attempts remain in the private working evidence and are not passes.

**This candidate has not undergone a complete installation on a clean destination
PC.** PowerShell/winget provisioning, Redlib compilation on that PC, actual
shortcut creation, Electron GUI operation, model/GPU performance, account-backed
calls and companion end-to-end behavior remain unobserved there. The current
machine's Web/Desktop backend checks do not substitute for those outcomes.
No new broad acceptance or model loop was started to conceal that limit.

The upstream Desktop shell remains unmodified and retains its normal update/
security behavior. It can register `dsh:` on first launch; do not use this setup
alongside another Desktop whose protocol association must be preserved. Normal
downloaded-script approval may be required. No tagged installer release or
public release asset has been published by this task. Existing releases and
Halo recovery files remain unchanged.

The next user-visible step is one installation on the intended new Windows PC,
then human sign-in and selected model downloads. The bundle contains the guide
and records installation progress. Source is delivered on the dedicated branch;
release merge/tag/publication is a separate action.
