# Vendored donor files

These directories retain byte-exact source, relevant original tests, and Apache-2.0 license bytes from the pinned commits recorded in [../PROVENANCE.md](../PROVENANCE.md).

- `devharmonics/`: commit `ee369b4eca02e22f5279fac5985fe124a79cde78`.
- `codex-factory/`: commit `51a31e01c5a7ae2233c79265521d2e30c3195991`.

Do not format or edit these files. Verify them with:

```powershell
git hash-object vendor/devharmonics/scripts/fleet.mjs vendor/devharmonics/test/fleet.test.mjs vendor/devharmonics/LICENSE vendor/codex-factory/scripts/factory-fleet.mjs vendor/codex-factory/test/factory-fleet.test.mjs vendor/codex-factory/LICENSE
```

Expected output, in order:

```text
1326858137d24c41e53b9e84e76abd92d7300d75
6f89636b4e64d34a6dd70918245fe6be263306e7
97ad1c8e34f92c09c03fa83c6f9a7a9a94d0c124
3328c1c469d7b06735af50e3f40e7a2657e9230b
ac4df9059ad671b87f9c81aa3a787e22cf6eee76
261eeb9e9f8b2b4b0d119366dda99c6fd7d35c64
```
