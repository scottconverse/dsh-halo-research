import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "./serve.mjs";
const root = new URL("../", import.meta.url);
const html = await readFile(new URL("dist/index.html", root), "utf8");
const components = JSON.parse(
  await readFile(
    new URL("../stack/complete-windows/components.json", root),
    "utf8",
  ),
);
assert.ok(
  html.includes(`DSH-Complete-Windows-${components.version}.zip`),
  "Download follows current bundle version",
);
assert.ok(
  html.includes(`Web + Desktop ${components.dsh}`),
  "Page follows pinned upstream version",
);
const releaseBase =
  "https://github.com/scottconverse/dsh-halo-research/releases";
assert.ok(
  html.includes(`href="${releaseBase}/tag/v0.3.14"`),
  "Published release has a visible link",
);
for (const suffix of [".zip", ".zip.sha256"]) {
  assert.ok(
    html.includes(
      `href="${releaseBase}/download/v0.3.14/DSH-Complete-Windows-${components.version}${suffix}"`,
    ),
    "Installer and checksum use published release assets",
  );
}
const expectedChecksum = (
  await readFile(
    new URL(
      `../stack/packages/DSH-Complete-Windows-${components.version}.zip.sha256`,
      root,
    ),
    "utf8",
  )
)
  .trim()
  .split(/\s+/)[0];
assert.ok(
  html.includes(expectedChecksum),
  "Displayed checksum matches the accepted checksum file",
);
const checksumCommand = html
  .match(/<code id="checksum-command"[^>]*>([\s\S]*?)<\/code/)[1]
  .trim();
assert.equal(
  checksumCommand,
  'Get-FileHash "$HOME\\Downloads\\DSH-Complete-Windows-0.1.2.zip" -Algorithm SHA256',
  "Checksum command is a directly copyable PowerShell line",
);

assert.ok(
  html.includes(`${releaseBase}/download/v0.3.14/INSTALLATION.md`),
  "Full installation guide belongs to the same release",
);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(ids).size, ids.length, "Unique anchors");
for (const [, fragment] of html.matchAll(/href="#([^"]+)"/g))
  assert.ok(ids.includes(fragment), `Anchor exists: ${fragment}`);
const local = [
  ...new Set(
    [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((s) => !s.startsWith("#") && !s.startsWith("https://")),
  ),
];
const server = createServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const base of ["/", "/dsh-halo-research/"]) {
    assert.equal((await fetch(origin + base)).status, 200);
    for (const relative of local) {
      const response = await fetch(origin + base + relative);
      assert.equal(response.status, 200, relative);
      assert.ok(
        !response.headers.get("content-type").startsWith("text/html"),
        `Asset is not HTML fallback: ${relative}`,
      );
    }
  }
  assert.equal(
    (await fetch(origin + "/README.md")).status,
    404,
    "Preview does not expose repository documents",
  );
  console.log(
    `PASS: current pins, unique anchors, ${local.length} assets at root/project paths, no repository exposure.`,
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}
