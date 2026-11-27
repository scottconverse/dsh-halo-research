import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
// Deliberate allowlist for public pages, assets, and publication-safe benchmark evidence.
const files = [
  "index.html",
  "styles.css",
  "site.js",
  "assets/mark.svg",
  "assets/desktop-mission-control.png",
  "benchmarks/qwen-next-2026-11-17/index.html",
  "benchmarks/qwen35-9b-2026-11-27/index.html",
  "benchmarks/qwen35-9b-2026-11-27/evidence/dsh-tasks.csv",
  "benchmarks/qwen35-9b-2026-11-27/evidence/direct-replays.csv",
  "benchmarks/qwen35-9b-2026-11-27/evidence/receipts.json",
  "benchmarks/qwen35-9b-vision-2026-11-27/index.html",
  "benchmarks/qwen35-9b-vision-2026-11-27/evidence/comparison.json",
  "benchmarks/qwen35-9b-vision-2026-11-27/evidence/prompt.txt",
  "benchmarks/qwen35-9b-vision-2026-11-27/evidence/ridge-field-check.png",
  "benchmarks/qwen35-9b-vision-2026-11-27/evidence/answer-key.json",
  "benchmarks/qwen35-9b-vision-2026-11-27/evidence/halo.json",
  "benchmarks/qwen35-9b-vision-2026-11-27/evidence/5060.json",
  "benchmarks/qwen35-9b-vision-2026-11-27/evidence/5070.json",
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
