import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
export function inside(root, relative) {
  if (!relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw Error('Unsafe relative path');
  const target = path.resolve(root, relative);
  if (!target.startsWith(path.resolve(root) + path.sep)) throw Error('Path escapes installation');
  return target;
}
export function digest(file, algorithm = 'sha256', encoding = 'hex') {
  // Large model-runtime archives must not require a single multi-GB Buffer.
  const hash = crypto.createHash(algorithm), buffer = Buffer.allocUnsafe(1024 * 1024);
  const fd = fs.openSync(file, 'r');
  try { let count; while ((count = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, count)); }
  finally { fs.closeSync(fd); }
  return hash.digest(encoding);
}
export function atomicJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.new';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temp, file);
}
export function verify(file, row) {
  const algorithm = row.sha512 ? 'sha512' : 'sha256';
  const encoding = row.sha512 ? 'base64' : 'hex';
  if (!row[algorithm] || digest(file, algorithm, encoding) !== row[algorithm]) throw Error(`Integrity mismatch: ${path.basename(file)}`);
}
export async function download(file, row) {
  if (fs.existsSync(file)) { verify(file, row); return; }
  const url = new URL(row.url);
  if (url.protocol !== 'https:' || url.username || url.password) throw Error('Artifact URL must be HTTPS without credentials');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const response = await fetch(url, { signal: AbortSignal.timeout(30 * 60 * 1000) });
  if (!response.ok || !response.body) throw Error(`Download HTTP ${response.status}: ${url.hostname}`);
  const partial = file + '.partial';
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(partial));
  verify(partial, row);
  fs.renameSync(partial, file);
}
export function verifyBundle(source) {
  const manifest = JSON.parse(fs.readFileSync(path.join(source, 'bundle.json')));
  for (const row of manifest.files) verify(inside(source, row.path), row);
  return manifest;
}
