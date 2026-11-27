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
const repository = "https://github.com/scottconverse/dsh-halo-research";
const releaseBase = `${repository}/releases`;
assert.ok(
  html.includes(`href="${releaseBase}/tag/v0.3.20"`),
  "Published release has a visible link",
);
for (const suffix of [".zip", ".zip.sha256"]) {
  assert.ok(
    html.includes(
      `href="${releaseBase}/download/v0.3.20/DSH-Complete-Windows-${components.version}${suffix}"`,
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
  'Get-FileHash "$HOME\\Downloads\\DSH-Complete-Windows-0.1.5.zip" -Algorithm SHA256',
  "Checksum command is a directly copyable PowerShell line",
);

for (const [path, label] of [
  ["/blob/v0.3.20/stack/complete-windows/README.md#install-on-the-destination-pc", "updated installation guide"],
  ["/releases/download/v0.3.20/VERIFICATION.json", "current installer verification receipt"],
  ["/tree/master/docs/evidence/complete-windows-0.1.4-5060ti-2026-11-20", "RTX 5060 Ti verification evidence"],
]) {
  assert.ok(html.includes(`href="${repository}${path}"`), `Page links to the ${label}`);
}
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
const report = await readFile(new URL("dist/Llama.cpp1.0.0vsStrata-QwenNext-Halo/index.html", root));
const originalReport = await readFile(new URL("dist/benchmarks/qwen-next-2026-11-17/index.html", root));
assert.ok(report.equals(originalReport), "The named route preserves the report bytes");
const newReportRoute = "benchmarks/qwen35-9b-2026-11-27/";
assert.ok(local.includes(newReportRoute), "Landing page links to the three-machine report");
const study = await readFile(new URL(`dist/${newReportRoute}index.html`, root), "utf8");
const studyDownloads = {
  "evidence/dsh-tasks.csv": "text/csv",
  "evidence/direct-replays.csv": "text/csv",
  "evidence/receipts.json": "application/json",
};
for (const evidence of Object.keys(studyDownloads)) {
  assert.ok(study.includes(`href="${evidence}"`), `Report links to ${evidence}`);
}
const visionRoute = "benchmarks/qwen35-9b-vision-2026-11-27/";
assert.ok(local.includes(visionRoute), "Landing page links to the vision report");
const vision = await readFile(new URL(`dist/${visionRoute}index.html`, root), "utf8");
const visionDownloads = new Map(
  [...vision.matchAll(/href="(evidence\/[^"]+)"/g)].map(([, file]) => [
    file,
    { json: "application/json", png: "image/png", txt: "text/plain" }[file.split(".").pop()],
  ]),
);
assert.equal(visionDownloads.size, 7, "Vision report links to all evidence files");
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
        response.headers.get("content-type").startsWith("text/html") ===
          (relative.endsWith("/")),
        `Expected content type: ${relative}`,
      );
    }
    for (const [file, type] of Object.entries(studyDownloads)) {
      const response = await fetch(origin + base + newReportRoute + file);
      assert.equal(response.status, 200, file);
      assert.ok(response.headers.get("content-type").startsWith(type), file);
      const source = await readFile(new URL(`${newReportRoute}${file}`, root));
      assert.ok(Buffer.from(await response.arrayBuffer()).equals(source), `Published bytes match ${file}`);
    }
    for (const [file, type] of visionDownloads) {
      const response = await fetch(origin + base + visionRoute + file);
      assert.equal(response.status, 200, file);
      assert.ok(response.headers.get("content-type").startsWith(type), file);
      const source = await readFile(new URL(`${visionRoute}${file}`, root));
      assert.ok(Buffer.from(await response.arrayBuffer()).equals(source), `Published bytes match ${file}`);
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
