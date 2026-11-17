import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
// Deliberate allowlist for public pages and assets. Archives, profiles and evidence logs stay out of Pages.
const files = [
  "index.html",
  "styles.css",
  "site.js",
  "assets/mark.svg",
  "assets/desktop-mission-control.png",
  "benchmarks/qwen-next-2026-11-17/index.html",
];
for (const file of files) {
  const target = path.join(root, "dist", file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(root, file), target);
}
const namedReport = path.join(root, "dist", "Llama.cpp1.0.0vsStrata-QwenNext-Halo/index.html");
await mkdir(path.dirname(namedReport), { recursive: true });
await copyFile(path.join(root, "benchmarks/qwen-next-2026-11-17/index.html"), namedReport);
await writeFile(path.join(root, "dist", ".nojekyll"), "");
console.log(
  `Built ${files.length} site assets into site/dist (no dependencies).`,
);
