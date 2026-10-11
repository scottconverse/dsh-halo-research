import fs from 'node:fs';
import z from 'node:zlib';

const path = process.argv[2];
if (!path) throw new Error('Usage: node summarize-compaction-session.mjs <local-session.v4.jsonl.zstd>');
let rest = fs.readFileSync(path);
let decoded = '';
let frames = 0;
while (rest.length) {
  const frame = z.zstdDecompressSync(rest, {info: true});
  decoded += frame.buffer.toString('utf8');
  rest = rest.subarray(frame.engine.bytesWritten);
  frames++;
}
const rows = decoded.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
const safeError = error => {
  if (!error || (typeof error !== 'object' && typeof error !== 'string')) return null;
  const messages = [];
  const visit = (value, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 5) return;
    if (typeof value.message === 'string') messages.push(value.message);
    for (const [key, child] of Object.entries(value)) {
      if (key !== 'message' && child && typeof child === 'object') visit(child, depth + 1);
    }
  };
  if (typeof error === 'string') messages.push(error);
  else visit(error);
  const joined = messages.join(' ').toLowerCase();
  let category = 'provider_error';
  if (/stream idle timeout/.test(joined)) category = 'pi_ai_stream_idle_timeout';
  else if (/timed? ?out|timeout/.test(joined) && /header/.test(joined)) category = 'undici_response_headers_timeout';
  else if (/context.{0,20}overflow|maximum context/.test(joined)) category = 'context_overflow';
  return {category, code: typeof error.code === 'string' ? error.code.slice(0, 80) : null};
};
const allEvents = rows.filter(row => row.type === 'compaction/start' || row.type === 'compaction/end');
const events = allEvents.slice(-12);
const starts = new Map(events.filter(row => row.type === 'compaction/start').map(row => [row.data?.compactionId, row.time]));
const output = events.map(row => ({
  type: row.type,
  sequence: row.seq,
  time: new Date(row.time).toISOString(),
  compactionId: row.data?.compactionId,
  commandId: row.data?.sourceCommandId,
  result: row.type === 'compaction/end' ? (row.data?.error ? 'failed' : 'completed') : 'started',
  durationMs: row.type === 'compaction/end' && starts.has(row.data?.compactionId) ? row.time - starts.get(row.data.compactionId) : null,
  error: safeError(row.data?.error)
}));
process.stdout.write(JSON.stringify({checkedAt: new Date().toISOString(), frames, eventCount: rows.length, compactionEventCount: allEvents.length, recentCompactions: output}, null, 2) + '\n');
