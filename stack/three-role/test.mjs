import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { Store, within, hashFile } from './core.mjs';
import { apply } from './index.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'dsh-three-role-'));
  const project = join(root, 'project'); mkdirSync(project);
  const file = join(root, 'state.json');
  const store = new Store(file);
  const p = store.create('parent', project, 'Fix bounded addition', [{ id: 'R1', text: 'add(2, 3) returns 5' }]);
  return { root, project, file, store, p };
}
test('durable state retains the complete contract, findings and dispositions across reload', () => {
  const f = fixture(); try {
    const finding = f.store.finding(f.p, { requirement: 'R1', evidence: 'add.mjs:1 subtracts', correction: 'Add operands' }).finding;
    f.store.disposition(f.p, 'coder', finding.id, 'fixed', 'add.mjs:1 now adds; test passed');
    f.store.disposition(f.p, 'auditor', finding.id, 'closed', 'Read add.mjs:1 and saved test receipt');
    const restored = new Store(f.file).project(f.p.id);
    assert.equal(restored.requirements[0].text, 'add(2, 3) returns 5'); assert.equal(restored.findings[0].status, 'closed');
  } finally { rmSync(f.root, { recursive: true }); }
});
test('reject scope expansion, duplicate nudges, unauthorized closure and premature completion', () => {
  const f = fixture(); try {
    assert.throws(() => f.store.finding(f.p, { requirement: 'NEW', evidence: 'x', correction: 'y' }), /agreed/);
    const a = { requirement: 'R1', evidence: 'subtract', correction: 'add' };
    f.store.finding(f.p, a); assert.equal(f.store.finding(f.p, a).duplicate, true);
    assert.equal(f.p.findings.length, 1);
    assert.throws(() => f.store.disposition(f.p, 'coder', 'A-001', 'closed', 'claim'), /Role/);
    assert.throws(() => f.store.disposition(f.p, 'auditor', 'A-001', 'closed', 'claim'), /coder-reported/);
    f.p.status = 'running';
    assert.throws(() => f.store.complete(f.p, () => 'idle'), /unresolved/);
    f.store.disposition(f.p, 'coder', 'A-001', 'fixed', 'receipt'); f.store.disposition(f.p, 'auditor', 'A-001', 'closed', 'source');
    f.store.requirement(f.p, 'R1', 'verified', 'source plus objective test receipt');
    f.p.reports = [{ role: 'coder' }, { role: 'auditor' }]; f.p.auditDirty = false;
    assert.throws(() => f.store.complete(f.p, () => 'running'), /active/);
    f.store.complete(f.p, () => 'idle'); assert.equal(f.p.status, 'complete');
  } finally { rmSync(f.root, { recursive: true }); }
});
test('read confinement rejects traversal outside the project', () => {
  const f = fixture(); try {
    writeFileSync(join(f.project, 'ok.txt'), 'okay'); writeFileSync(join(f.root, 'private.txt'), 'secret');
    assert.equal(within(f.project, 'ok.txt'), join(f.project, 'ok.txt'));
    assert.throws(() => within(f.project, '../private.txt'), /outside/);
    writeFileSync(join(f.project, 'ok.txt'), 'abc');
    assert.deepEqual(hashFile(f.project, 'ok.txt'), { path: 'ok.txt', algorithm: 'SHA256', bytes: 3, sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' });
    writeFileSync(join(f.project, 'ok.txt'), 'abc\r\n');
    assert.equal(hashFile(f.project, 'ok.txt').bytes, 5);
    assert.notEqual(hashFile(f.project, 'ok.txt').sha256, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    assert.throws(() => hashFile(f.project, '../private.txt'), /outside/);
    assert.throws(() => hashFile(f.project, '.'), /regular/);
  } finally { rmSync(f.root, { recursive: true }); }
});

test('Windows transient read lock retries only the atomic state commit', { skip: process.platform !== 'win32' }, async () => {
  const f = fixture(); let child;
  try {
    const script = join(f.root, 'hold.ps1');
    writeFileSync(script, "param($Target)\n$f=[IO.File]::Open($Target,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)\n[Console]::WriteLine('LOCKED');[Console]::Out.Flush();Start-Sleep -Milliseconds 150;$f.Dispose()\n");
    child = spawn('pwsh', ['-NoProfile', '-File', script, f.file], { windowsHide: true });
    const exited = new Promise(resolve => child.once('exit', resolve));
    await new Promise((resolve, reject) => { child.stdout.once('data', resolve); child.once('error', reject); });
    f.p.revision = 17; f.store.save();
    assert.equal(new Store(f.file).project(f.p.id).revision, 17);
    assert.equal(await exited, 0);
  } finally { if (child && child.exitCode === null) child.kill(); rmSync(f.root, { recursive: true }); }
});

test('profile installer previews, requires idle acknowledgment, preserves bytes and is idempotent', { skip: process.platform !== 'win32' }, () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-three-role-install-'));
  try {
    const dir = join(root, 'profiles', 'test'); mkdirSync(dir, { recursive: true });
    const file = join(dir, 'cordis.patch.yml');
    const original = '# existing settings\n- id: models\n  config:\n    reasoning: low\n    maxTokens: 65536\n    contextWindow: 1048576\n';
    writeFileSync(file, original);
    const args = ['-NoProfile', '-File', new URL('./Install-ThreeRole.ps1', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), '-DshHome', root, '-Profile', 'test'];
    execFileSync('pwsh', args); assert.equal(readFileSync(file, 'utf8'), original);
    assert.throws(() => execFileSync('pwsh', [...args, '-Apply'], { stdio: 'pipe' }));
    execFileSync('pwsh', [...args, '-Apply', '-IdleConfirmed']);
    const installed = readFileSync(file, 'utf8'); assert.ok(installed.startsWith(original));
    assert.match(installed, /id: halo-three-role/);
    execFileSync('pwsh', [...args, '-Apply', '-IdleConfirmed']); assert.equal(readFileSync(file, 'utf8'), installed);
  } finally { rmSync(root, { recursive: true }); }
});
test('adapter enforces roles and relays a real structured finding under live parent identity', async () => {
  const f = fixture(), agents = new Map(), presets = new Map(), handlers = new Map(), sent = [];
  let dispose;
  const parent = { id: 'parent', status: 'idle' }, coder = { id: 'coder', status: 'idle' }, auditor = { id: 'auditor', status: 'running' };
  for (const a of [parent, coder, auditor]) agents.set(a.id, a);
  const interrupted = []; let goal = { id: 'goal-1', revision: 1, phase: 'active', activation: 'armed', roundsStarted: 3, maxGoalRounds: 256 };
  const base = { agents: { get: id => agents.get(id) },
    subagents: { registerProvider() {}, interrupt(id, authority) { assert.equal(authority.kind, 'ancestor'); assert.equal(authority.agent, parent); interrupted.push(id); }, async sendMessage(sender, id, content) { assert.equal(sender, parent); sent.push({ id, content }); return 'message-1'; } },
    agentPresets: { async register(p) { presets.set(p.id, p); return () => {}; } }, goals: { get: () => goal, pause: () => { goal = { ...goal, phase: 'paused', activation: 'disarmed', revision: goal.revision + 1 }; }, resume: () => { assert.notEqual(goal.activation, 'armed', 'do not resume an already armed goal'); goal = { ...goal, phase: 'active', activation: 'armed', revision: goal.revision + 1 }; } },
    on(name, fn) { if (name === 'dispose') dispose = fn; else handlers.set(name, fn); return () => { if (handlers.get(name) === fn) handlers.delete(name); }; }, tools: {} };
  try {
    // Replace prepared fixture with identities known by the adapter.
    f.p.children = { coder: 'coder', auditor: 'auditor' }; f.p.status = 'running'; f.store.save();
    await apply(base, { stateFile: f.file }); assert.equal(presets.size, 3);
    for (const preset of presets.values()) {
      const compact = preset.plugins.find(p => p.id === 'compaction');
      assert.equal(compact.isolate.compaction, true);
      const cfg = compact.config.find(p => p.id === 'compaction-basic').config;
      assert.equal(cfg.auto, true); assert.equal(cfg.maxTokens, 8192);
      assert.deepEqual(cfg.modelPolicies, [{ provider: 'ollama', model: 'deepseek-v4.1-flash:1017-cloud', thresholdRatio: 0.7 }]);
    }
    const tools = new Map(); let guard;
    const ctx = { ...base, tools: { guard(g) { guard = g; }, register(t) { tools.set(t.name, t); } }, on() {} };
    await apply(ctx, { role: 'auditor' });
    assert.equal(tools.get('triad_finding').parameters.type, 'object');
    assert.deepEqual(tools.get('triad_finding').parameters.required, ['requirement', 'evidence', 'correction']);
    assert.match(guard({ name: 'pwsh' }), /no authority/); assert.match(guard({ name: 'write' }), /no authority/);
    assert.equal(guard({ name: 'get_goal' }), undefined);
    assert.match(guard({ name: 'triad_control' }), /cannot/); assert.equal(guard({ name: 'triad_read' }), undefined);
    const exec = { agent: auditor, signal: new AbortController().signal };
    writeFileSync(join(f.project, 'bytes.txt'), 'okay');
    assert.equal(JSON.parse(await tools.get('triad_hash').execute({ path: 'bytes.txt' }, exec)).bytes, 4);
    await assert.rejects(tools.get('triad_hash').execute({ path: 'bytes.txt' }, { ...exec, agent: coder }), /authority/);
    await assert.rejects(tools.get('triad_finding').execute({ evidence: 'missing requirement' }, exec), /required/);
    const result = JSON.parse(await tools.get('triad_finding').execute({ requirement: 'R1', evidence: 'add.mjs:1 subtracts', correction: 'Add operands' }, exec));
    assert.equal(result.finding.delivery, 'delivered'); assert.equal(sent[0].id, 'coder'); assert.match(sent[0].content[0].text, /AUDITOR FINDING A-001/);
    await tools.get('triad_finding').execute({ requirement: 'R1', evidence: 'add.mjs:1 subtracts', correction: 'Add operands' }, exec);
    assert.equal(sent.length, 1);
    await assert.rejects(tools.get('triad_finding').execute({ requirement: 'R1', evidence: 'x', correction: 'y' }, { ...exec, agent: coder }), /authority/);
    const status = JSON.parse(await tools.get('triad_status').execute({}, exec)); assert.equal(status.requirements.length, 1);
    const toolCoder = new Map(); let coderGuard;
    await apply({ ...ctx, tools: { register(t) { toolCoder.set(t.name, t); }, guard(g) { coderGuard = g; } } }, { role: 'coder' });
    assert.equal(coderGuard({ name: 'edit' }), undefined); assert.match(coderGuard({ name: 'send_message' }), /explicit/);
    assert.match(coderGuard({ name: 'triad_hash' }), /cannot/);
    assert.match(coderGuard({ name: 'create_goal' }), /explicit/);
    const controls = new Map(); let parentGuard;
    await apply({ ...ctx, tools: { register(t) { controls.set(t.name, t); }, guard(g) { parentGuard = g; } } }, { role: 'coordinator' });
    assert.equal(parentGuard({ name: 'edit', agent: coder }), undefined, 'parent role does not restrict the child role');
    assert.match(parentGuard({ name: 'edit', agent: parent }), /no authority/);
    const parentExec = { ...exec, agent: parent };
    const goalReadback = JSON.parse(await controls.get('triad_status').execute({}, parentExec)).goal;
    assert.equal(goalReadback.activation, 'armed');
    assert.equal(goalReadback.roundsStarted, 3);
    const armedRevision = goal.revision;
    await controls.get('triad_control').execute({ action: 'resume' }, parentExec);
    assert.equal(goal.revision, armedRevision, 'an explicit resume does not mutate an already armed goal');
    goal = { ...goal, activation: 'disarmed' };
    await controls.get('triad_status').execute({}, parentExec);
    assert.equal(goal.activation, 'disarmed', 'read-only status must never rearm a goal');
    const rearmed = JSON.parse(await controls.get('triad_control').execute({ action: 'resume' }, parentExec));
    assert.equal(goal.activation, 'armed', 'explicit resume repairs active but disarmed continuation');
    assert.equal(goal.revision, armedRevision + 1);
    assert.equal(rearmed.goal.activation, 'armed');
    assert.equal(goal.roundsStarted, 3, 'resuming never resets the goal budget');
    sent.length = 1; // Preserve the earlier finding receipt for the scheduling assertions below.
    const coderExec = { ...exec, agent: coder };
    const post = handlers.get('tools/post-execute');
    const current = () => new Store(f.file).project(f.p.id);
    for (const name of ['read', 'grep', 'glob', 'skill', 'read_image', 'job_list']) await post({ agent: coder, name }, null, async () => 'read');
    assert.equal(current().revision, 0, 'read-only tools never invalidate review');
    await toolCoder.get('triad_finding_action').execute({ id: 'A-001', action: 'acknowledged', evidence: 'Investigating the source' }, coderExec);
    assert.equal(current().revision, 0, 'acknowledgment is not a changed implementation');
    const progress = JSON.parse(await toolCoder.get('triad_report').execute({ evidence: 'Still investigating; finding remains open' }, coderExec));
    assert.deepEqual(progress.awaitingCoder, ['A-001']);
    assert.equal(current().findings[0].status, 'acknowledged');
    await assert.rejects(tools.get('triad_finding_action').execute({ id: 'A-001', action: 'closed', evidence: 'Looks fixed' }, exec), /coder-reported/);
    const baseline = JSON.parse(await tools.get('triad_report').execute({ evidence: 'Baseline gap; awaiting Coder disposition', reviewedRevision: 0 }, exec));
    assert.equal(baseline.auditDirty, false);
    for (const name of ['edit', 'pwsh', 'job_output']) await post({ agent: coder, name }, null, async () => 'changed');
    assert.equal(current().revision, 3);
    assert.equal(current().auditQueued, false, 'review is coalesced rather than sent for every tool');
    await new Promise(resolve => setTimeout(resolve, 15200));
    assert.equal(sent.filter(s => s.id === 'auditor').length, 1, 'ready work is reviewed despite an unrelated pending disposition');
    assert.equal(current().findings[0].status, 'acknowledged', 'review scheduling cannot close the pending finding');
    await toolCoder.get('triad_finding_action').execute({ id: 'A-001', action: 'fixed', evidence: 'add.mjs now adds; saved test receipt' }, coderExec);
    await toolCoder.get('triad_report').execute({ evidence: 'Implementation checkpoint, disposition recorded' }, coderExec);
    assert.equal(sent.filter(s => s.id === 'auditor').length, 1, 'one coalesced review, not one per tool');
    assert.equal(current().auditQueued, true);
    await assert.rejects(tools.get('triad_report').execute({ evidence: 'review without cut' }, exec), /reviewedRevision/);
    await post({ agent: coder, name: 'write' }, null, async () => 'newer change during review');
    const stale = JSON.parse(await tools.get('triad_report').execute({ evidence: 'Reviewed earlier cut only', reviewedRevision: 4 }, exec));
    assert.equal(stale.auditDirty, true, 'a changed-during-review generation cannot be cleared by stale report');
    await tools.get('triad_finding_action').execute({ id: 'A-001', action: 'closed', evidence: 'Read actual changed path and saved receipt' }, exec);
    await tools.get('triad_requirement').execute({ id: 'R1', status: 'verified', evidence: 'End-to-end code and receipt traced' }, exec);
    await tools.get('triad_report').execute({ evidence: 'Full requirement reconciliation at current cut', reviewedRevision: 5 }, exec);
    assert.equal(current().auditDirty, false);
    await assert.rejects(post({ agent: coder, name: 'write' }, null, async () => { throw new Error('partial write failure'); }), /partial write/);
    assert.equal(current().revision, 6, 'failed mutations must invalidate prior acceptance too');
    const sentBeforeManual = sent.filter(s => s.id === 'auditor').length;
    await controls.get('triad_control').execute({ action: 'message', role: 'auditor', message: 'Inspect current cut now' }, parentExec);
    await new Promise(resolve => setTimeout(resolve, 15200));
    assert.equal(sent.filter(s => s.id === 'auditor').length, sentBeforeManual + 1, 'manual review consumes pending automatic wake');
    assert.equal(current().auditQueued, true);
    await tools.get('triad_report').execute({ evidence: 'Reconciled failed mutation outcome', reviewedRevision: 6 }, exec);
    const compactStatus = JSON.parse(await tools.get('triad_status').execute({}, exec));
    assert.equal(compactStatus.requirements[0].text, undefined);
    assert.equal(compactStatus.findings[0].history, undefined);
    assert.equal(compactStatus.reports.auditor, 4);
    const contract = JSON.parse(await tools.get('triad_status').execute({ view: 'contract' }, exec));
    assert.equal(contract.requirements[0].text, 'add(2, 3) returns 5');
    const evidence = JSON.parse(await tools.get('triad_status').execute({ view: 'evidence', id: 'A-001' }, exec));
    assert.equal(evidence.history.length, 3);
    const full = JSON.parse(await tools.get('triad_status').execute({ view: 'full' }, exec));
    assert.equal(full.reports.length, 6); assert.ok(full.events.length > 0);
    assert.ok(JSON.stringify(compactStatus).length < JSON.stringify(full).length / 2, 'summary omits accumulated narratives without deleting them');
    await assert.rejects(controls.get('triad_control').execute({ action: 'resume', role: 'coder' }, parentExec), /role is valid only/);
    await controls.get('triad_control').execute({ action: 'pause' }, parentExec);
    assert.deepEqual(interrupted, ['coder', 'auditor']); assert.equal(goal.phase, 'paused');
    assert.equal(goal.activation, 'disarmed');
    await controls.get('triad_status').execute({}, parentExec);
    assert.equal(goal.phase, 'paused', 'observing a human pause must preserve it');
    assert.match(coderGuard({ name: 'write', agent: coder }), /paused/);
    const resumed = JSON.parse(await controls.get('triad_control').execute({ action: 'resume' }, parentExec));
    assert.equal(goal.phase, 'active'); assert.deepEqual(resumed.children, { coder: 'coder', auditor: 'auditor' });
    assert.deepEqual(sent.slice(-2).map(s => s.id), ['coder', 'auditor']);
    // Exercise actual pre/post tracking on the same execution object.
    const git = (...args) => execFileSync('git', ['-C', f.project, ...args], { windowsHide: true });
    git('init', '-q'); git('add', '.');
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture');
    const head = JSON.parse(await tools.get('triad_git').execute({ view: 'head' }, exec));
    assert.match(head, /^[0-9a-f]{40}\s*$/);
    const pre = handlers.get('tools/pre-execute');
    const beforePoll = current().revision;
    const poll = { agent: coder, name: 'job_output' };
    await pre(poll, async () => ({})); await post(poll, null, async () => 'unchanged output');
    assert.equal(current().revision, beforePoll, 'unchanged output polling does not invalidate source review');
    const shell = { agent: coder, name: 'pwsh' };
    await pre(shell, async () => ({})); writeFileSync(join(f.project, 'bytes.txt'), 'actual changed bytes');
    await post(shell, null, async () => 'completed');
    assert.equal(current().revision, beforePoll + 1, 'actual shell changes still invalidate source review');
    writeFileSync(join(f.project, 'bytes.txt'), 'background job changed before output was polled');
    const asyncPoll = { agent: coder, name: 'job_output' };
    await pre(asyncPoll, async () => ({})); await post(asyncPoll, null, async () => 'background result');
    assert.equal(current().revision, beforePoll + 2, 'asynchronous changes between polls remain reviewable');
  } finally { dispose?.(); rmSync(f.root, { recursive: true }); }
});
