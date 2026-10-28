import {
  closeSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { emptyState, applyBatch, report } from './ledger.mjs';

const USAGE =
  'Usage: node cli.mjs apply <state.json> <batch.json> | node cli.mjs report <state.json>';

function readState(statePath) {
  let raw;
  try {
    raw = readFileSync(statePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return emptyState();
    throw error;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in state file: ${statePath}`);
  }
}

function readBatch(batchPath) {
  const raw = readFileSync(batchPath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in batch file: ${batchPath}`);
  }
}

function writeStateAtomic(statePath, state) {
  const directory = dirname(statePath);
  const prefix = `.${basename(statePath)}.${process.pid}.`;
  const payload = JSON.stringify(state);

  let temporaryPath;
  let descriptor;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = join(directory, `${prefix}${randomBytes(12).toString('hex')}.tmp`);
    try {
      // wx guarantees this process created the file and never overwrites an
      // existing file, including another process's temporary file.
      descriptor = openSync(candidate, 'wx', 0o600);
      temporaryPath = candidate;
      break;
    } catch (error) {
      if (error && error.code === 'EEXIST') continue;
      throw error;
    }
  }
  if (descriptor === undefined || temporaryPath === undefined) {
    throw new Error('Could not create a unique temporary file');
  }

  let renamed = false;
  try {
    writeFileSync(descriptor, payload, 'utf8');
    closeSync(descriptor);
    descriptor = undefined;

    // Same-directory rename is atomic on a single filesystem. The old ledger
    // is untouched until this point.
    renameSync(temporaryPath, statePath);
    renamed = true;
  } finally {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // Preserve the original failure.
      }
    }
    if (!renamed) {
      try {
        // The wx-created temporary path is owned by this invocation.
        unlinkSync(temporaryPath);
      } catch {
        // Preserve the original failure; never remove an unrelated path.
      }
    }
  }
}

function run() {
  const [command, ...args] = process.argv.slice(2);

  if (command === 'report' && args.length === 1) {
    const result = report(readState(args[0]));
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  if (command === 'apply' && args.length === 2) {
    const state = readState(args[0]);
    const batch = readBatch(args[1]);
    const next = applyBatch(state, batch);
    const result = report(next);
    // Validate and render everything before replacing the ledger.
    writeStateAtomic(args[0], next);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  throw new Error(USAGE);
}

try {
  run();
} catch (error) {
  const message =
    error && typeof error.message === 'string' ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ error: message })}\n`);
  process.exitCode = 1;
}
