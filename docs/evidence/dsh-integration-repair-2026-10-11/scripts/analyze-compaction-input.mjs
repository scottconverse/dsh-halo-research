import fs from 'node:fs';
import path from 'node:path';
import z from 'node:zlib';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const [sessionPath, stockDshRoot, summarizerMaxTokensText] = process.argv.slice(2);
if (!sessionPath || !stockDshRoot || !summarizerMaxTokensText) {
  throw new Error('Usage: node analyze-compaction-input.mjs <local-session.v4.jsonl.zstd> <stock-dsh-root> <active-preset-summarizer-max-tokens>');
}
const summarizerMaxTokens = Number(summarizerMaxTokensText);
if (!Number.isSafeInteger(summarizerMaxTokens) || summarizerMaxTokens <= 0) throw new Error('The active preset summarizer token limit must be a positive integer');
const packageRequire = createRequire(path.join(path.resolve(stockDshRoot), 'package.json'));
const compactionRequire = createRequire(packageRequire.resolve('@deepseek-ai/dsh-compaction-basic'));
const sessionApi = await import(pathToFileURL(compactionRequire.resolve('@deepseek-ai/dsh-session')));
const compactionApi = await import(pathToFileURL(compactionRequire.resolve('@deepseek-ai/dsh-compaction')));
const estimateApi = await import(pathToFileURL(compactionRequire.resolve('@deepseek-ai/dsh-token-meter/estimate')));
const {checkpointRequest} = await import(pathToFileURL(path.join(path.resolve(stockDshRoot), 'compaction-text-only.mjs')));

let rest = fs.readFileSync(sessionPath);
let decoded = '';
let frames = 0;
while (rest.length) {
  const frame = z.zstdDecompressSync(rest, {info: true});
  decoded += frame.buffer.toString('utf8');
  rest = rest.subarray(frame.engine.bytesWritten);
  frames++;
}
const events = decoded.trim().split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(event => event.type !== 'session');
const sessionId = path.basename(path.dirname(path.resolve(sessionPath))).replace(/^session-/, '');
const session = sessionApi.Session.create(sessionApi.SessionId(sessionId), events);
const nodes = session.surface.nodes;
const firstEvent = session.eventAt(nodes[0]);
const hasSystemHead = firstEvent?.type === 'system/message';
const firstCompactableIndex = hasSystemHead ? 1 : 0;

// This mirrors selectCompactableRange(session, measurement, 0) used by compactNow.
let keepFromIndex = nodes.length - 1;
while (keepFromIndex > firstCompactableIndex &&
       !compactionApi.toolPairingBalancedBefore(session, nodes[keepFromIndex])) {
  keepFromIndex--;
}
const shadowedSeqs = nodes.slice(firstCompactableIndex, keepFromIndex);
const system = hasSystemHead ? session.deriveEventMessage(firstEvent) : null;
const regionMessages = shadowedSeqs.map(seq => session.deriveEventMessage(session.eventAt(seq))).filter(Boolean);
const inputMessages = system ? [system, ...regionMessages] : regionMessages;
const header = session.requestHeader();
const route = header?.config ?? {};
const target = {provider: route.provider, model: route.model};
const request = checkpointRequest({messages: inputMessages}, target, summarizerMaxTokens, sessionId);
const serializedConversation = JSON.stringify(inputMessages);
const messageMetrics = inputMessages.map((message, index) => {
  const eventSeq = index === 0 && system ? nodes[0] : shadowedSeqs[index - (system ? 1 : 0)];
  const event = eventSeq === undefined ? null : session.eventAt(eventSeq);
  const blockChars = message.content.map(block => block.type === 'text' || block.type === 'reasoning'
    ? block.text.length
    : block.type === 'tool-call' ? block.arguments.length + block.name.length : JSON.stringify(block).length);
  return {
    role: message.role,
    sourceEventType: event?.type ?? 'derived-system-head',
    sequence: eventSeq ?? null,
    serializedChars: JSON.stringify(message).length,
    contentChars: blockChars.reduce((total, chars) => total + chars, 0),
    blockCount: message.content.length
  };
});
const largest = [...messageMetrics].sort((a, b) => b.serializedChars - a.serializedChars).slice(0, 8)
  .map(({role, sourceEventType, sequence, serializedChars, contentChars, blockCount}) => ({role, sourceEventType, sequence, serializedChars, contentChars, blockCount}));
const roleCounts = Object.groupBy(inputMessages, message => message.role);
const summarizedRoles = Object.fromEntries(Object.entries(roleCounts).map(([role, messages]) => [role, messages.length]));
const requestTokenEstimate = request.messages.reduce((total, message) => total + estimateApi.estimateMessage(message), 0);
const result = {
  evidenceOnly: true,
  rawMessageTextPrinted: false,
  packageVersion: '0.2.1-alpha.2',
  sourceFrames: frames,
  sourceEventCount: events.length,
  surfaceNodeCount: nodes.length,
  selectedRange: shadowedSeqs.length ? {startSurfaceIndex: firstCompactableIndex, endSurfaceIndexExclusive: keepFromIndex, firstSourceEventSeq: shadowedSeqs[0], lastSourceEventSeq: shadowedSeqs.at(-1), nodeCount: shadowedSeqs.length} : null,
  retainedBalancedTailNodeCount: nodes.length - firstCompactableIndex - shadowedSeqs.length,
  selectedRangeSourceEventTypes: Object.fromEntries([...new Set(shadowedSeqs.map(seq => session.eventAt(seq)?.type ?? 'unknown'))].map(type => [type, shadowedSeqs.filter(seq => session.eventAt(seq)?.type === type).length])),
  checkpointInput: {
    route: {provider: target.provider, model: target.model, summarizerMaxTokens: request.maxTokens},
    inputMessageCount: inputMessages.length,
    inputRoleCounts: summarizedRoles,
    serializedMessagesChars: serializedConversation.length,
    serializedMessagesUtf8Bytes: Buffer.byteLength(serializedConversation),
    outgoingCheckpointPromptCharacters: request.messages.reduce((total, message) => total + message.content.reduce((chars, block) => chars + (block.type === 'text' || block.type === 'reasoning' ? block.text.length : 0), 0), 0),
    dshHeuristicRequestTokenEstimate: requestTokenEstimate,
    toolSchemasForwardedByWrapper: request.tools?.length ?? 0,
    largestSerializedMessages: largest
  },
  limitations: ['Reconstructed from the durable session surface; not a captured HTTP request.', 'Token count is the installed DSH fixed-density heuristic, not provider tokenizer usage.', 'Any runtime-only SessionProjectionRegistry plugins are not applied by this offline reconstruction.']
};
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
