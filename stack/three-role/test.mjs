import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Store, within } from './core.mjs';
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
  } finally { rmSync(f.root, { recursive: true }); }
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
  const interrupted = []; let goal = { id: 'goal-1', revision: 1, phase: 'active' };
  const base = { agents: { get: id => agents.get(id) },
    subagents: { registerProvider() {}, interrupt(id, authority) { assert.equal(authority.kind, 'ancestor'); assert.equal(authority.agent, parent); interrupted.push(id); }, async sendMessage(sender, id, content) { assert.equal(sender, parent); sent.push({ id, content }); return 'message-1'; } },
    agentPresets: { async register(p) { presets.set(p.id, p); return () => {}; } }, goals: { get: () => goal, pause: () => { goal = { ...goal, phase: 'paused', revision: goal.revision + 1 }; }, resume: () => { goal = { ...goal, phase: 'active', revision: goal.revision + 1 }; } },
    on(name, fn) { if (name === 'dispose') dispose = fn; else handlers.set(name, fn); }, tools: {} };
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
    assert.match(coderGuard({ name: 'create_goal' }), /explicit/);
    const controls = new Map(); let parentGuard;
    await apply({ ...ctx, tools: { register(t) { controls.set(t.name, t); }, guard(g) { parentGuard = g; } } }, { role: 'coordinator' });
    assert.equal(parentGuard({ name: 'edit', agent: coder }), undefined, 'parent role does not restrict the child role');
    assert.match(parentGuard({ name: 'edit', agent: parent }), /no authority/);
    const parentExec = { ...exec, agent: parent };
    await assert.rejects(controls.get('triad_control').execute({ action: 'resume', role: 'coder' }, parentExec), /role is valid only/);
    await controls.get('triad_control').execute({ action: 'pause' }, parentExec);
    assert.deepEqual(interrupted, ['coder', 'auditor']); assert.equal(goal.phase, 'paused');
    assert.match(coderGuard({ name: 'write', agent: coder }), /paused/);
    const resumed = JSON.parse(await controls.get('triad_control').execute({ action: 'resume' }, parentExec));
    assert.equal(goal.phase, 'active'); assert.deepEqual(resumed.children, { coder: 'coder', auditor: 'auditor' });
    assert.deepEqual(sent.slice(-2).map(s => s.id), ['coder', 'auditor']);
  } finally { dispose?.(); rmSync(f.root, { recursive: true }); }
});
