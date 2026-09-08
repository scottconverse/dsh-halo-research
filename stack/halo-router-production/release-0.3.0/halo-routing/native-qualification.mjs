import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

const MAX_RECEIPTS = 256;

function containedBy(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function exactText(value) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function finishedTime(record) {
  if (typeof record?.finished !== 'string') return null;
  const milliseconds = Date.parse(record.finished);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

async function devReceiptDirectory(home) {
  if (typeof home !== 'string' || !path.isAbsolute(home)) return null;
  try {
    const realHome = await realpath(home);
    const nativeCli = path.join(realHome, 'native-cli');
    const directory = path.join(nativeCli, 'receipts');
    const [nativeInfo, receiptInfo] = await Promise.all([lstat(nativeCli), lstat(directory)]);
    if (!nativeInfo.isDirectory() || nativeInfo.isSymbolicLink() || !receiptInfo.isDirectory() || receiptInfo.isSymbolicLink()) return null;
    const realDirectory = await realpath(directory);
    return containedBy(realHome, realDirectory) ? realDirectory : null;
  } catch {
    return null;
  }
}

async function receiptCandidate(directory, file, binding) {
  const receiptPath = path.join(directory, file);
  try {
    const info = await lstat(receiptPath);
    if (!info.isFile() || info.isSymbolicLink()) return null;
    const realReceipt = await realpath(receiptPath);
    if (!containedBy(directory, realReceipt)) return null;
    const raw = await readFile(realReceipt);
    const record = JSON.parse(raw.toString('utf8'));
    if (record?.sessionId !== binding.sessionId || record?.provider !== binding.provider || record?.model !== binding.model) return null;
    const finishedMilliseconds = finishedTime(record);
    if (finishedMilliseconds === null || !record?.result || typeof record.result !== 'object') return null;
    return {
      finishedMilliseconds,
      ok: record.result.ok === true,
      final: typeof record.result.final === 'string' ? record.result.final : null,
      status: typeof record.result.status === 'string' ? record.result.status : null,
      finishedAt: record.finished,
      receiptPath: realReceipt,
      receiptHash: createHash('sha256').update(raw).digest('hex'),
    };
  } catch {
    return null;
  }
}

// Reads only the host-written DEV data-root receipt. It deliberately returns
// raw `result.final`, never the decorated text stream that DSH displayed.
export async function readNativeQualificationResult(home, binding) {
  if (!exactText(binding?.sessionId) || !exactText(binding?.provider) || !exactText(binding?.model)) return null;
  const notBefore = binding?.notBefore === undefined ? -Infinity : finishedTime({ finished: binding.notBefore });
  if (notBefore === null) return null;
  const directory = await devReceiptDirectory(home);
  if (!directory) return null;
  let files;
  try {
    files = (await readdir(directory)).filter((file) => file.endsWith('.json')).sort().reverse().slice(0, MAX_RECEIPTS);
  } catch {
    return null;
  }
  let newest = null;
  for (const file of files) {
    const candidate = await receiptCandidate(directory, file, binding);
    if (candidate && candidate.finishedMilliseconds >= notBefore
      && (newest === null || candidate.finishedMilliseconds > newest.finishedMilliseconds)) newest = candidate;
  }
  if (!newest) return null;
  const { finishedMilliseconds, ...result } = newest;
  return result;
}
