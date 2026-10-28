import { readFileSync, writeFileSync, renameSync, mkdirSync, realpathSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const ROLES = ['coordinator', 'coder', 'auditor'];
export function boundedText(value, label, max = 12000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label} must be nonempty text, at most ${max} characters`);
  return value.trim();
}
export function within(root, path) {
  const base = realpathSync(root), target = realpathSync(resolve(base, path));
  const rel = relative(base, target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Path is outside the approved project');
  return target;
}
export class Store {
  constructor(file) {
    this.file = file;
    this.data = { version: 1, projects: {} };
    try { this.data = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (this.data.version !== 1) throw new Error('Unsupported project-state version');
  }
  save() {
    mkdirSync(dirname(this.file), { recursive: true });
    const temp = `${this.file}.${process.pid}.tmp`;
    writeFileSync(temp, JSON.stringify(this.data, null, 2));
    renameSync(temp, this.file);
  }
  event(p, type, detail) {
    p.events.push({ seq: p.events.length + 1, time: new Date().toISOString(), type, ...detail });
    this.save();
  }
  create(coordinator, cwd, objective, requirements) {
    if (Object.values(this.data.projects).some(p => p.coordinator === coordinator && !['complete', 'abandoned'].includes(p.status))) throw new Error('Coordinator already owns an unfinished project');
    cwd = realpathSync(cwd);
    if (!statSync(cwd).isDirectory()) throw new Error('Workspace must be a directory');
    if (!Array.isArray(requirements) || !requirements.length || requirements.length > 100) throw new Error('Supply 1–100 explicit agreed requirements');
    const ids = new Set();
    const reqs = requirements.map(r => {
      const id = boundedText(r.id, 'requirement id', 80);
      if (ids.has(id)) throw new Error('Duplicate requirement id'); ids.add(id);
      return { id, text: boundedText(r.text, 'requirement'), status: 'unreviewed', evidence: [] };
    });
    const p = { id: randomUUID(), coordinator, cwd, objective: boundedText(objective, 'objective'), requirements: reqs,
      status: 'prepared', children: {}, findings: [], reports: [], events: [], auditDirty: true, auditQueued: false };
    this.data.projects[p.id] = p;
    this.event(p, 'created', { coordinator });
    return p;
  }
  project(id) { const p = this.data.projects[id]; if (!p) throw new Error('Unknown project'); return p; }
  member(agentId) {
    for (const p of Object.values(this.data.projects).reverse()) {
      if (p.coordinator === agentId) return { p, role: 'coordinator' };
      for (const role of ['coder', 'auditor']) if (p.children[role] === agentId) return { p, role };
    }
  }
  finding(p, input) {
    if (!p.requirements.some(r => r.id === input.requirement)) throw new Error('Finding must cite an agreed requirement');
    const body = { requirement: input.requirement, evidence: boundedText(input.evidence, 'evidence'), correction: boundedText(input.correction, 'correction') };
    const fingerprint = createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const existing = p.findings.find(f => f.fingerprint === fingerprint && f.status !== 'closed');
    if (existing) return { finding: existing, duplicate: true };
    const f = { id: `A-${String(p.findings.length + 1).padStart(3, '0')}`, ...body, fingerprint, status: 'open', delivery: 'pending', history: [] };
    p.findings.push(f); this.event(p, 'finding', { finding: f.id }); return { finding: f, duplicate: false };
  }
  disposition(p, role, id, action, evidence) {
    const f = p.findings.find(f => f.id === id); if (!f) throw new Error('Unknown finding');
    const allowed = role === 'coder' ? ['acknowledged', 'fixed', 'disputed'] : role === 'auditor' ? ['closed', 'open', 'disputed'] : [];
    if (!allowed.includes(action)) throw new Error('Role cannot make that finding disposition');
    if (role === 'auditor' && action === 'closed' && f.status !== 'fixed') throw new Error('Auditor may close only a coder-reported fix; disputes go to Coordinator');
    f.history.push({ role, action, evidence: boundedText(evidence, 'disposition evidence'), time: new Date().toISOString() });
    f.status = action; this.event(p, 'disposition', { finding: id, role, action }); return f;
  }
  requirement(p, id, status, evidence) {
    const r = p.requirements.find(r => r.id === id); if (!r) throw new Error('Unknown agreed requirement');
    if (!['verified', 'gap', 'blocked'].includes(status)) throw new Error('Invalid requirement status');
    r.status = status; r.evidence.push(boundedText(evidence, 'requirement evidence')); this.event(p, 'requirement', { id, status }); return r;
  }
  complete(p, live) {
    if (p.status !== 'running') throw new Error('Only a running project can complete');
    if (p.requirements.some(r => r.status !== 'verified') || p.findings.some(f => f.status !== 'closed')) throw new Error('Agreed requirements or findings remain unresolved');
    if (!p.reports.some(r => r.role === 'coder') || !p.reports.some(r => r.role === 'auditor')) throw new Error('Both worker reports are required');
    if (p.auditDirty || p.auditQueued || live('coder') === 'running' || live('auditor') === 'running') throw new Error('Workers or review are still active');
    p.status = 'complete'; this.event(p, 'complete', {});
  }
}
