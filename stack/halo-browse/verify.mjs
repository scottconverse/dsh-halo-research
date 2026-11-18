import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';

const [runtime, home, surface, patchFile] = process.argv.slice(2);
const source = parse(readFileSync(patchFile, 'utf8'), {
  customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: value => value }],
});
const inserts = source.flatMap(row => row.insert ?? []);
const runProfilePath = pathToFileURL(join(runtime, '@deepseek-ai/dsh/lib/profile-boot.js'));
const appBootPath = pathToFileURL(join(runtime, '@deepseek-ai/dsh-app-boot/lib/index.js'));
const scopePath = pathToFileURL(join(runtime, '@deepseek-ai/dsh-scope/lib/index.js'));
const [{ runProfile }, { loadLayeredEnv }, { scopeOf }] = await Promise.all(
  [runProfilePath, appBootPath, scopePath].map(url => import(url)),
);
const surfaceHome = resolve(home, 'profiles', surface);
mkdirSync(surfaceHome, { recursive: true });
process.env.DSH_HOME = resolve(home);
process.env.DSH_AGENTS_HOME = resolve(home, 'agents');
process.env.DSH_TELEMETRY_DISABLED = '1';
process.chdir(home);
const model = 'qwen3.8-flash-next-iq3_s';
const presets = ['local', 'local-lean', 'local-5070', 'local-5070-capped', 'local-5070-browse', 'local-5070-capped-browse']
  .map(id => inserts.find(row => row.id === 'halo-preset-' + id))
  .map(({ config, ...row }) => ({
    ...row, config: { ...config, plugins: config.plugins.filter(p => p.id === 'mcp-halo-browse') },
  }));
const hook = inserts.find(row => row.id === 'halo-browse-lead-route');
assert(hook);
writeFileSync(join(surfaceHome, 'package.json'), JSON.stringify({
  name: 'browse-fixture',
  dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'], patchReload: 'never' } },
}));
writeFileSync(join(surfaceHome, 'cordis.patch.yml'), JSON.stringify([
  { id: 'agent-default-model', config: { provider: 'fixture-default', model } },
  { id: 'agent-preset-registry', config: { default: 'local', selectedDefault: 'local' } },
  { insert: [...presets, hook] },
]));

const website = createServer((_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end('<html><head><title>Halo Browse Smoke</title></head><body><h1>Halo Browse Smoke</h1></body></html>');
});
website.listen(0, '127.0.0.1');
await once(website, 'listening');
let app;
try {
  app = await runProfile({
    profile: surface, patchFiles: [], args: ['--no-open', '--host', '127.0.0.1', '--port', '0'],
    environment: loadLayeredEnv('dsh', home),
  });
  const { ctx } = app;
  assert(![...ctx.tools.view().visible.keys()].some(name => name.includes('halo_browse')));
  for (const { config: { id } } of presets) {
    const { sessionId } = await ctx.get('sessionController').create({ cwd: home, agentPreset: id });
    const agent = ctx.agents.get(sessionId);
    const scope = scopeOf(agent.ctx);
    assert(scope);
    const tools = [...ctx.tools.view(scope).visible.keys()].filter(name => name.includes('halo_browse'));
    if (!id.endsWith('-browse')) {
      assert.deepEqual(tools, [], id + ' has Browse tools');
      continue;
    }
    const navigateName = tools.find(name => name.endsWith('navigate'));
    assert(navigateName, JSON.stringify(tools));
    assert.equal(agent.model.current().provider, id.includes('capped') ? 'strata-halo-capped' : 'strata-halo-auto');
    const tool = ctx.tools.get(navigateName, scope);
    const opts = { agent, signal: AbortSignal.timeout(25000) };
    const tabs = ctx.tools.get(tools.find(name => name.endsWith('__tabs')), scope);
    const snapshot = ctx.tools.get(tools.find(name => name.endsWith('__snapshot')), scope);
    assert(!tools.some(name => name.endsWith('__execute')));
    const origin = 'http://127.0.0.1:' + website.address().port;
    const tab = 'dsh-smoke-' + randomUUID().slice(0, 8);
    await tabs.execute({ action: 'new', id: tab, allowedOrigins: [origin] }, opts);
    try {
      const result = await tool.execute({ tab, url: origin }, opts);
      assert.match(JSON.stringify(result), /Halo Browse Smoke/);
      const view = await snapshot.execute({ tab }, opts);
      assert.match(JSON.stringify(view), /Halo Browse Smoke/);
    } finally {
      await tabs.execute({ action: 'close', tab }, opts);
    }
    console.log(surface + ' ' + id + ': real Browse navigation on loopback passed');
  }
  console.log(surface + ': global, normal and 5070 Ti worker preset have no Browse tools');
} finally {
  await app?.ctx.fiber.dispose();
  website.closeAllConnections();
  website.close();
}
