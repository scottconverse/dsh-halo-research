/**
 * Phase 0 continuity seam for the isolated Halo Router DEV profile.
 *
 * This is deliberately host-free: it exercises the published SessionStore and
 * Session APIs in memory, writes one DEV-owned JSON persistence artifact, then
 * restores it through Session.fromRestore/SessionStore.prepare. No model or
 * LLM call is made. Observation is a fire-and-forget session/event listener;
 * it is not a session projection and never appends an observation event.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const devRoot = path.resolve(import.meta.dirname);
// Resolve through the installed DEV profile, whose package graph is the one
// the web host uses. This keeps the evidence script runnable from any cwd.
const profileRequire = createRequire(path.join(devRoot, 'home', 'profiles', 'web', 'package.json'));
const { Context } = await import(pathToFileURL(profileRequire.resolve('@deepseek-ai/cordis')));
const { createAssistantMessage, createUserMessage } = await import(pathToFileURL(profileRequire.resolve('@deepseek-ai/dsh-llm')));
const { default: SessionStore, Session } = await import(pathToFileURL(profileRequire.resolve('@deepseek-ai/dsh-session')));
const { SessionPersistence } = await import(pathToFileURL(profileRequire.resolve('@deepseek-ai/dsh-session-persistence')));
const evidenceDir = path.join(devRoot, 'home', 'evidence');
const artifactPath = path.join(evidenceDir, 'phase0-continuity-session.json');
const reportPath = path.join(evidenceDir, 'phase0-continuity.json');
const sessionId = 'phase0-continuity';
const modelConfig = { provider: 'fixture', model: 'halo-dev-fixed', temperature: 0 };

assert.equal(typeof SessionPersistence, 'function', 'published persistence seam must be installed');

const ctx = new Context();
await ctx.plugin(SessionStore);
const session = ctx.sessions.create(sessionId, {
  meta: { cwd: devRoot, agentPreset: 'halo-router-dev' },
});

const firstObserver = [];
const stopFirstObserver = ctx.on('session/event', (observedSession, event) => {
  if (observedSession === session) firstObserver.push({ seq: event.seq, type: event.type });
});

session.append('request/header', {
  header: { config: modelConfig },
  reason: 'initial',
});
session.append('turn/start', { turn: 1 });
session.append('step/start', { turn: 1, step: 0 });
const userEvent = session.append('user/message', createUserMessage({
  content: [{ type: 'text', text: 'continuity fixture user event' }],
  source: { kind: 'user' },
}), { surfaceOp: 'append' });
const assistantEvent = session.append('assistant/message', {
  turn: 1,
  step: 0,
  message: createAssistantMessage({
    content: [{ type: 'text', text: 'continuity fixture assistant event' }],
    source: { provider: modelConfig.provider, model: modelConfig.model },
  }),
}, { surfaceOp: 'append', sourceEventSeqs: [] });
session.append('step/end', { turn: 1, step: 0 });
session.append('turn/end', { turn: 1, reason: { kind: 'completed' } });

const initialConfigSnapshot = JSON.stringify(session.requestHeader()?.config);
assert.equal(initialConfigSnapshot, JSON.stringify(modelConfig));
assert.deepEqual(session.surface.nodes, [userEvent.seq, assistantEvent.seq]);
assert.equal(firstObserver.length, session.events.length, 'mounted observer receives each accepted event once');

stopFirstObserver();
const afterUnmount = firstObserver.length;
session.append('todo/write', { todos: [] });
assert.equal(firstObserver.length, afterUnmount, 'unmounted observer receives no later events');

const secondObserver = [];
const stopSecondObserver = ctx.on('session/event', (observedSession, event) => {
  if (observedSession === session) secondObserver.push({ seq: event.seq, type: event.type });
});
session.append('request/context', { provider: modelConfig.provider, model: modelConfig.model });
assert.deepEqual(secondObserver, [{ seq: session.events.at(-1).seq, type: 'request/context' }]);
stopSecondObserver();

const thirdObserver = [];
const stopThirdObserver = ctx.on('session/event', (observedSession, event) => {
  if (observedSession === session) thirdObserver.push({ seq: event.seq, type: event.type });
});

// Stock compaction surface protocol, with a fixture summary and no model call.
// The compaction records are log-only; the following user/message is the one
// surface replacement and cites every shadowed node plus its compaction records.
const compactionId = 'phase0-continuity-compaction';
const compactionStart = session.append('compaction/start', { compactionId, turn: null });
const compactionSummary = session.append('compaction/summary', {
  compactionId,
  summary: [{ type: 'text', text: 'fixture summary; no model generation' }],
  shadowedRange: { start: userEvent.seq, end: assistantEvent.seq },
  shadowedSeqs: [userEvent.seq, assistantEvent.seq],
  shadowedTokenCount: 8,
  provider: 'fixture',
  model: modelConfig.model,
});
const replacementEvent = session.append('user/message', createUserMessage({
  content: [{ type: 'text', text: 'fixture summary; no model generation' }],
  source: { kind: 'plugin', plugin: 'dsh-compaction-basic' },
}), {
  surfaceOp: { op: 'replace', start: userEvent.seq, end: assistantEvent.seq },
  sourceEventSeqs: [compactionStart.seq, compactionSummary.seq, userEvent.seq, assistantEvent.seq],
});
session.append('compaction/end', { compactionId, turn: null });
stopThirdObserver();

assert.deepEqual(session.surface.nodes, [replacementEvent.seq]);
assert.equal(session.deriveMessages().length, 1, 'stock surface replacement leaves one summary message');
assert.equal(JSON.stringify(session.requestHeader()?.config), initialConfigSnapshot, 'observer/compaction did not change model config');
assert.equal(new Set(thirdObserver.map((event) => event.seq)).size, thirdObserver.length, 'remounted observer has no duplicate delivery');
assert.deepEqual(thirdObserver.map((event) => event.type), [
  'compaction/start', 'compaction/summary', 'user/message', 'compaction/end',
]);

const durable = { header: session.header, events: session.events };
await mkdir(evidenceDir, { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(durable, null, 2)}\n`, 'utf8');
const reopenedData = JSON.parse(await readFile(artifactPath, 'utf8'));
const reopenedDetached = Session.fromRestore(reopenedData.header.id, reopenedData.events, reopenedData.header);
// A restored seed gets the stock lifecycle's non-publication end-seed marker;
// the persisted prefix itself remains byte-for-byte identical.
assert.deepEqual(reopenedDetached.events.slice(0, session.events.length), session.events, 'persistence artifact replays the exact event log prefix');
assert.equal(reopenedDetached.events.at(-1)?.type, 'session/end-seed');
assert.deepEqual(reopenedDetached.surface.nodes, session.surface.nodes, 'replayed surface matches compacted surface');
assert.deepEqual(reopenedDetached.deriveMessages(), session.deriveMessages(), 'replayed model history matches compacted history');

const reopenedCtx = new Context();
await reopenedCtx.plugin(SessionStore);
const prepared = reopenedCtx.sessions.prepare(sessionId, {
  seedSource: 'persistence',
  seed: reopenedData.events,
  meta: reopenedData.header,
});
const detachReopened = reopenedCtx.sessions.enter(prepared);
reopenedCtx.sessions.announce(prepared);
assert.equal(reopenedCtx.sessions.get(sessionId), prepared, 'SessionStore reopens the persisted identity');
assert.deepEqual(prepared.deriveMessages(), session.deriveMessages());
detachReopened();

const report = {
  pass: true,
  at: new Date().toISOString(),
  sessionPackage: '@deepseek-ai/dsh-session@0.1.1-rc.2',
  persistencePackage: '@deepseek-ai/dsh-session-persistence@0.1.1-rc.2',
  persistenceMode: 'DEV JSON artifact + published Session.fromRestore/SessionStore.prepare seam',
  modelGeneration: false,
  observationDoesNotAppend: true,
  initialEvents: session.events.length,
  surfaceBeforeCompaction: [userEvent.seq, assistantEvent.seq],
  surfaceAfterCompaction: [...session.surface.nodes],
  replayEventCount: reopenedDetached.events.length,
  replaySurface: [...reopenedDetached.surface.nodes],
  observerMounts: [firstObserver.length, secondObserver.length, thirdObserver.length],
  remountNoDuplicateDelivery: true,
  modelConfigUnchanged: true,
  artifact: artifactPath,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
