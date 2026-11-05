// Reconstruct the retained six rc.5 Halo edits into a NEW archive only.
// Never changes the input archive, profiles, running processes or goal state.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const source = path.dirname(fileURLToPath(import.meta.url));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export function applyEdits(bytes, row) {
  const current = digest(bytes);
  if (current === row.afterSha256) return bytes;
  if (current !== row.beforeSha256) throw Error(`Source/version mismatch: ${row.path}`);
  let output = bytes;
  let ceiling = bytes.length;
  for (const edit of [...row.edits].reverse()) {
    if (!Number.isSafeInteger(edit.offset) || !Number.isSafeInteger(edit.removeBytes) || edit.offset < 0 || edit.removeBytes < 0 || edit.offset + edit.removeBytes > ceiling) throw Error('Invalid patch offsets');
    output = Buffer.concat([output.subarray(0, edit.offset), Buffer.from(edit.insertUtf8, 'utf8'), output.subarray(edit.offset + edit.removeBytes)]);
    ceiling = edit.offset;
  }
  if (digest(output) !== row.afterSha256) throw Error(`Reconstruction hash mismatch: ${row.path}`);
  return output;
}
function readAt(fd, size, position) {
  const bytes = Buffer.alloc(size);
  let done = 0;
  while (done < size) { const count = fs.readSync(fd, bytes, done, size-done, position+done); if (!count) throw Error('Truncated archive'); done += count; }
  return bytes;
}
export function recover(input, output) {
  input = path.resolve(input);
  if (output && path.resolve(output) === input) throw Error('Output must be a NEW separate file');
  if (output && fs.existsSync(output)) throw Error('Output already exists; refusing overwrite');
  const patch = JSON.parse(fs.readFileSync(path.join(source, 'patches.json')));
  const fd = fs.openSync(input, 'r');
  try {
    const prefix = readAt(fd,16,0), base = 8+prefix.readUInt32LE(4);
    const header = JSON.parse(readAt(fd,prefix.readUInt32LE(12),16).toString('utf8'));
    const entry = p => p.split('/').reduce((node,key) => node.files[key],header);
    const load = p => { const e = entry(p); return readAt(fd,e.size,base+Number(e.offset)); };
    if (JSON.parse(load('package.json')).version !== patch.version) throw Error('Expected official DSH Desktop '+patch.version);
    const changes = patch.files.map(row => ({row, entry: entry(row.path), bytes: applyEdits(load(row.path),row)}));
    const plan = {version:patch.version, input, output: output ? path.resolve(output) : null, files:changes.map(({row}) => ({path:row.path,afterSha256:row.afterSha256})), inputChanged:false};
    if (!output) return {...plan, mode:'plan-only'};
    let offset = fs.fstatSync(fd).size-base;
    for (const change of changes) {
      const e = change.entry, b = change.bytes;
      e.offset = String(offset); e.size = b.length;
      const blockSize = e.integrity?.blockSize ?? 4194304;
      const blocks = []; for (let i=0; i<b.length; i+=blockSize) blocks.push(digest(b.subarray(i,i+blockSize)));
      e.integrity = {algorithm:'SHA256',hash:digest(b),blockSize,blocks}; offset += b.length;
    }
    const json = Buffer.from(JSON.stringify(header)), headerSize = 8+Math.ceil(json.length/4)*4;
    const h = Buffer.alloc(8+headerSize); h.writeUInt32LE(4,0); h.writeUInt32LE(headerSize,4); h.writeUInt32LE(headerSize-4,8); h.writeUInt32LE(json.length,12); json.copy(h,16);
    const out = fs.openSync(output,'wx');
    try {
      fs.writeFileSync(out,h);
      // Bound memory while copying the official archive payload.
      const buffer = Buffer.alloc(1024*1024); let position = base;
      while (true) { const count = fs.readSync(fd,buffer,0,buffer.length,position); if (!count) break; fs.writeFileSync(out,buffer.subarray(0,count)); position += count; }
      for (const change of changes) fs.writeFileSync(out,change.bytes);
    } finally { fs.closeSync(out); }
    return {...plan,mode:'new-file-reconstruction'};
  } finally { fs.closeSync(fd); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 2 && args.length !== 4 || args[0] !== '--archive' || args.length === 4 && args[2] !== '--output') throw Error('Usage: node recover-archive.mjs --archive <rc.5 app.asar> [--output <NEW archive>]');
  console.log(JSON.stringify(recover(args[1],args[3]),null,2));
}
