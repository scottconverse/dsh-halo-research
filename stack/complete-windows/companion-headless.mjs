import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [directory, surface] = process.argv.slice(2);
assert(directory && ['web', 'desktop'].includes(surface), 'Usage: node companion-headless.mjs INSTALL_ROOT web|desktop');
const root = resolve(directory);
const runtime = join(root, 'node_modules/@deepseek-ai');
const home = mkdtempSync(join(tmpdir(), 'dsh-complete-companions-'));
assert(!existsSync(join(root, 'stack/strata-paired/settings.json')), 'The isolated fixture may not have real model settings');
const require = createRequire(join(root, 'package.json'));
const { parse } = require('yaml');
const model = 'qwen3.8-flash-next-iq3_s';
const modelRoutes = { 'local-5070': 'strata-halo-auto', 'local-5070-capped': 'strata-halo-capped' };
const config = JSON.parse(readFileSync(join(root, 'components.json')));
const rows = parse(readFileSync(join(root, 'home/profiles', surface, 'cordis.patch.yml'), 'utf8'));
const inserts = rows.find(row => row.insert).insert;
const presets = new Set(['cloud-coding', 'local-lean', ...Object.keys(modelRoutes), ...Object.keys(modelRoutes).map(row => row + '-browse')]);
const fixtureRows = rows.map(row => row.insert ? { insert: row.insert.filter(item =>
  presets.has(item.config?.id) || ['halo-strata-auto-start', 'halo-browse-lead-route'].includes(item.id),
) } : row);
const providerRows = fixtureRows.find(row => row.id === 'llm-pi-ai').config.providers;
delete providerRows.ollama;
fixtureRows.find(row => row.id === 'agent-default-model').config = { provider: 'fixture-default', model };
const dir = join(home, 'profiles', surface);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'package.json'), JSON.stringify({
  name: 'installer-companion-fixture', private: true,
  dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'], patchReload: 'never' } },
}));
writeFileSync(join(dir, 'cordis.patch.yml'), JSON.stringify(fixtureRows));
Object.assign(process.env, {
  DSH_HOME: home, DSH_AGENTS_HOME: join(home, 'agents'), DSH_TELEMETRY_DISABLED: '1',
  DSH_COMPLETE_STRATA_TOKEN: 'fixture-only',
});
process.chdir(home);

const servers = [];
const calls = [];
const created = [];
function listen(handler, port = 0) {
  const server = createServer(handler);
  servers.push(server);
  server.listen(port, '127.0.0.1');
  return once(server, 'listening').then(() => server);
}
function mock(provider) {
  return (req, res) => {
    calls.push({ provider, url: req.url, method: req.method });
    if (req.url === '/health') return res.end(JSON.stringify({ status: 'ok' }));
    if (req.url === '/v1/models') return res.end(JSON.stringify({ data: [{ id: model }] }));
    if (req.method !== 'POST' || req.url !== '/v1/chat/completions') return res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end('data: ' + JSON.stringify({
      id: 'fixture-' + provider, object: 'chat.completion.chunk', created: 1, model,
      choices: [{ index: 0, delta: { role: 'assistant', content: provider }, finish_reason: 'stop' }],
    }) + '\n\ndata: [DONE]\n\n');
  };
}
const here = join(root, 'stack/strata-paired');
const cappedState = join(here, 'halo-capped-state.json');
const out = { surface, leads: [], normalAndWorkerBrowseToolsAbsent: false, inferenceEndpoints: 'mock only' };
let app;
try {
  await listen(mock('strata-halo-auto'), config.ports.strataFull);
  await listen(mock('strata-halo-capped'), config.ports.strataCapped);
  await listen(mock('strata-5070ti'), config.ports.strataWorker);
  const website = await listen((_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end('<title>DSH installer Browse proof</title><h1>DSH installer Browse proof</h1>');
  });
  writeFileSync(cappedState, JSON.stringify({
    status: 'ready', started: Date.now() / 1000, maxSeconds: 1800, workingSetCaps: [{}, {}],
  }), { flag: 'wx' });
  created.push(cappedState);
  const [{ runProfile }, { loadLayeredEnv }, { scopeOf }] = await Promise.all([
    'dsh/lib/profile-boot.js', 'dsh-app-boot/lib/index.js', 'dsh-scope/lib/index.js',
  ].map(entry => import(pathToFileURL(join(runtime, entry)))));
  app = await runProfile({
    profile: surface, patchFiles: [], args: ['--no-open', '--host', '127.0.0.1', '--port', '0'],
    environment: loadLayeredEnv('dsh', home),
  });
  const { ctx } = app;
  const sessions = ctx.get('sessionController');
  const browseNames = scope => [...ctx.tools.view(scope).visible.keys()].filter(name => name.startsWith('mcp__halo_browse__'));
  assert.deepEqual(browseNames(undefined), []);
  async function ask(provider) {
    const start = calls.length;
    let result = '';
    for await (const chunk of ctx.llm.stream({
      provider, model, maxTokens: 32,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Fixture only.' }] }],
    })) {
      if (chunk.type === 'finish') assert.notEqual(chunk.reason.kind, 'error', JSON.stringify(chunk));
      if (chunk.type === 'text-delta') result += chunk.text;
    }
    assert.equal(result, provider);
    const actual = calls.slice(start).filter(call => call.provider === provider);
    const request = actual.findIndex(call => call.method === 'POST');
    assert(request > 0 && actual.slice(0, request).some(call => call.url === '/health'));
    assert(actual.slice(0, request).some(call => call.url === '/v1/models'));
  }
  for (const id of presets) {
    const { sessionId } = await sessions.create({ cwd: home, agentPreset: id });
    const agent = ctx.agents.get(sessionId);
    const scope = scopeOf(agent.ctx);
    assert(scope);
    const lead = modelRoutes[id.replace(/-browse$/, '')];
    const hasBrowse = id.endsWith('-browse');
    if (!hasBrowse) assert.deepEqual(browseNames(scope), [], id);
    if (!lead) {
      assert.equal(agent.model.current().provider, 'fixture-default');
      assert(!ctx.tools.get('delegate_to_5070ti', scope));
      continue;
    }
    assert.equal(agent.model.current().provider, lead);
    assert(ctx.tools.get('delegate_to_5070ti', scope));
    await ask(lead);
    if (hasBrowse) {
      const call = (name, args) => ctx.tools.get('mcp__halo_browse__' + name, scope)
        .execute(args, { agent, signal: AbortSignal.timeout(25000) });
      const tab = 'installer-proof-' + randomUUID().slice(0, 8);
      const origin = 'http://127.0.0.1:' + website.address().port;
      await call('tabs', { action: 'new', id: tab, allowedOrigins: [origin] });
      try {
        await call('navigate', { tab, url: origin });
        assert.match(JSON.stringify(await call('snapshot', { tab })), /DSH installer Browse proof/);
      } finally {
        await call('tabs', { action: 'close', tab });
      }
    }
    out.leads.push({ preset: id, lead, browse: hasBrowse ? 'real loopback page read' : 'tool absent' });
  }
  const worker = inserts.find(row => row.id === 'halo-preset-local-5070').config.plugins
    .find(row => row.id === 'tool-subagent').config;
  assert.equal(worker.agentPreset, 'local-lean');
  assert.equal(worker.provider, 'spawn');
  await ask(worker.agentOptions.provider);
  out.normalAndWorkerBrowseToolsAbsent = true;
  out.workerRoute = worker.agentOptions.provider;
  console.log('COMPANION_VERIFICATION ' + JSON.stringify(out));
} finally {
  await app?.ctx.fiber.dispose();
  for (const server of servers) {
    server.closeAllConnections();
    server.close();
  }
  for (const file of created) unlinkSync(file);
}
