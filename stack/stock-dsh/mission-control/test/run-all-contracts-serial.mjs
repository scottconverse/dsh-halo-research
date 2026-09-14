import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const suites = fs.readdirSync(testDir)
  .filter(name => name.endsWith('.test.mjs'))
  .sort((left, right) => left.localeCompare(right));

if (!suites.length) {
  console.error(`No Mission Control contract suites found in ${testDir}`);
  process.exit(1);
}

for (const suite of suites) {
  const file = path.join(testDir, suite);
  const result = spawnSync(process.execPath, ['--test', file], {
    cwd: path.join(testDir, '..'),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) {
    console.error(`${suite}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
