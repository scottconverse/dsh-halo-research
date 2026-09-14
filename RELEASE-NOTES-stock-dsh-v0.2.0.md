# Stock DSH for Halo v0.2.0

This release adds Mission Control to the supported stock DeepSeek Harness deployment while retaining the two-model Halo profile, Wigolo-first research, native web fallback, and full local Windows access.

## Mission Control

The preserved Mission Control design and full feature set have been ported to DSH `0.1.5-rc.2`. The dashboard runs locally at `http://127.0.0.1:3090` and includes:

- Overview health, current work, throughput, alerts, and quick actions;
- downloaded and resident LM Studio model management;
- DSH session grouping, context and activity detail, and guarded cancellation;
- complete Cordis plugin inventory and phase/failure detail;
- RAM, GPU, disk, runtime, validation, and log views;
- optional persistent-memory graph, writer, recovery-task, and snapshot status; and
- a bounded settings editor for approved model, compaction, retry, and stream-timeout values.

Mission Control uses DSH's authenticated `0.1.5-rc.2` HTTP and WebSocket contracts. DSH launch credentials are exchanged and retained server-side. The browser receives only a random per-launch Mission Control action token, and all mutation requests require that token plus an exact loopback origin.

Missing or stale evidence cannot produce a healthy status. Persistent Halo memory is currently unconfigured in the stock deployment and appears as unavailable until an operator configures a real backing store. This release does not manufacture or seed memory data.

## Unified lifecycle

The existing **DSH + Wigolo** desktop shortcut is now the front door for the whole stack. It verifies or repairs the approved LM Studio model envelope, starts or reuses DSH and its Wigolo child, installs the exact tested Mission Control build, starts or reuses the dashboard, and opens it in Google Chrome.

The **Stop DSH + Wigolo** shortcut stops Mission Control, DSH, and the exact Wigolo MCP child tree. LM Studio and the approved loaded models remain running for the next launch.

## Operator and recovery records

- Canonical deployment: `stack/stock-dsh`
- Live DSH home: `C:\Users\scott\.dsh-stock`
- Canonical Mission Control: `stack/stock-dsh/mission-control`
- Installed Mission Control: `C:\Users\scott\.dsh-stock\mission-control`
- Feature contract: `stack/stock-dsh/mission-control/FEATURE-PARITY.md`
- Installation and live-acceptance procedure: `stack/stock-dsh/mission-control/INSTALLATION.md`

The release candidate passed 132 deterministic contract checks, all lifecycle PowerShell parse checks, and 190 live acceptance checks. The installed Mission Control copy matched the canonical source at SHA-256 `3E9845D4AFCB88F80BE57C3B78B46532DA92346C7B3FFC3FD4F722584CC420F9`. A Chrome walkthrough confirmed all seven tabs, live configuration validation, the honest unconfigured-memory state, and the authenticated **Open DSH in Chrome** action.
