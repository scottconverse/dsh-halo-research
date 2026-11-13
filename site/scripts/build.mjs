import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
// Deliberate allowlist: never publish repository archives, profiles or evidence logs.
const files = [
  "index.html",
  "styles.css",
  "site.js",
  "assets/mark.svg",
  "assets/desktop-mission-control.png",
];
for (const file of files) {
  const target = path.join(root, "dist", file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, file), target);
}
await writeFile(path.join(root, "dist", ".nojekyll"), "");
console.log(
  `Built ${files.length} site assets into site/dist (no dependencies).`,
);
