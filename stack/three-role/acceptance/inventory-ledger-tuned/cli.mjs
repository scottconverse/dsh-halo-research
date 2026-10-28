import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { emptyState, applyBatch, report } from './ledger.mjs';

const USAGE = 'usage: cli.mjs apply <state.json> <batch.json> | cli.mjs report <state.json>';

class UsageError extends Error {}

function readState(file) {
  if (!existsSync(file)) return emptyState();
  return JSON.parse(readFileSync(file, 'utf8'));
}

// Writes to a unique sibling temporary file, then atomically renames it over the
// ledger. The live ledger is only replaced after the whole payload is on disk, and
// cleanup removes exactly the temporary file this process created.
function writeStateAtomic(file, state) {
  const payload = JSON.stringify(state);
  const directory = dirname(file);
  const base = basename(file);
  let tempPath = null;
  let descriptor = null;
  try {
    for (let attempt = 0; attempt < 5 && tempPath === null; attempt += 1) {
      const candidate = join(
        directory,
        `.${base}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`,
      );
      try {
        descriptor = openSync(candidate, 'wx');
        tempPath = candidate;
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
    }
    if (tempPath === null) throw new Error('Unable to create a unique temporary ledger file');
    try {
      writeFileSync(descriptor, payload, 'utf8');
    } finally {
      closeSync(descriptor);
      descriptor = null;
    }
    renameSync(tempPath, file);
    tempPath = null;
  } finally {
    if (descriptor !== null) {
      try {
        closeSync(descriptor);
      } catch {
        // The descriptor is already unusable; the temporary file is still removed.
      }
    }
    if (tempPath !== null) {
      try {
        unlinkSync(tempPath);
      } catch {
        // Cleanup is best-effort; the ledger itself was never touched.
      }
    }
  }
}

function run(argv) {
  const [command, ...rest] = argv;
  if (command === 'apply') {
    if (rest.length !== 2) throw new UsageError(USAGE);
    const [statePath, batchPath] = rest;
    const state = readState(statePath);
    const batch = JSON.parse(readFileSync(batchPath, 'utf8'));
    const next = applyBatch(state, batch);
    writeStateAtomic(statePath, next);
    return report(next);
  }
  if (command === 'report') {
    if (rest.length !== 1) throw new UsageError(USAGE);
    return report(readState(rest[0]));
  }
  throw new UsageError(USAGE);
}

try {
  const result = run(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ error: message })}\n`);
  process.exitCode = 1;
}
