import fs from 'node:fs';

const path = process.argv[2];
if (!path) throw new Error('Usage: node summarize-native-receipt.mjs <local-native-provider-verification.json>');
const rows = JSON.parse(fs.readFileSync(path, 'utf8'));
if (!Array.isArray(rows)) throw new Error('Expected an array of verification receipts');
const allowed = rows.map(row => ({
  provider: row.provider,
  model: row.model,
  started: row.started,
  finished: row.finished,
  durationMs: Number.isFinite(row.result?.durationMs) ? row.result.durationMs : null,
  ok: row.result?.ok === true,
  status: row.result?.status,
  exitCode: Number.isInteger(row.result?.exitCode) ? row.result.exitCode : null,
  continuityResumed: row.continuity?.resumed === true
}));
process.stdout.write(JSON.stringify({count: allowed.length, records: allowed}, null, 2) + '\n');
