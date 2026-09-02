// SCOPE: development-only bootstrap/catalog. No upstream accounts or models invoked.
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const origin = 'http://127.0.0.1:20129';
const permitted = new Set([
  'GET /api/settings/require-login', 'POST /api/settings/require-login',
  'POST /api/auth/login', 'GET /api/settings', 'PATCH /api/settings',
  'POST /api/keys', 'GET /api/provider-nodes', 'POST /api/provider-nodes',
  'GET /api/models?all=true', 'GET /api/providers',
]);

export async function configureProvider({ fetchImpl = fetch, secret = {}, saveSecret = () => {}, origin = 'http://127.0.0.1:20130' } = {}) {
  let cookie = '';
  async function request(route, method = 'GET', body) {
    if (!permitted.has(`${method} ${route}`)) throw new Error('This bootstrap does not invoke upstream providers.');
    const response = await fetchImpl(`${origin}${route}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { 'content-type': 'application/json', origin, ...(cookie ? { cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new Error(`${method} ${route}: HTTP ${response.status}; response body withheld.`);
    const cookies = response.headers.getSetCookie();
    if (cookies.length) cookie = cookies.map(value => value.split(';', 1)[0]).join('; ');
    return response.json();
  }

  const status = await request('/api/settings/require-login');
  if (status.hasPassword && !secret.password) throw new Error('An existing development password is configured but its isolated credential is missing. Not overwriting it.');
  if (!secret.password) {
    secret = { ...secret, origin, password: randomBytes(32).toString('base64url'), createdUtc: new Date().toISOString() };
    await saveSecret(secret);
  }
  if (!status.hasPassword) await request('/api/settings/require-login', 'POST', { requireLogin: true, password: secret.password });
  await request('/api/auth/login', 'POST', { password: secret.password });
  if (!cookie) throw new Error('Development dashboard login returned no session cookie.');

  // Stock defaults enable cloud syncing. Attempt to disable it, then verify
  // its actual destination before creating a key. Version 3.8.50 silently
  // strips cloudEnabled from PATCH; cloudSync.ts returns without a network
  // call when CLOUD_URL/NEXT_PUBLIC_CLOUD_URL is unset (cloudConfigured=false).
  await request('/api/settings', 'PATCH', { cloudEnabled: false });
  const settingsResponse = await request('/api/settings');
  const settings = settingsResponse.settings ?? settingsResponse;
  const cloudSyncCanSend = settings.cloudEnabled !== false &&
    !(settings.cloudConfigured === false && !settings.cloudUrl);
  if (cloudSyncCanSend) throw new Error('Development cloud sync has a possible destination; no API key created.');
  if (!secret.apiKey) {
    const key = await request('/api/keys', 'POST', { name: 'DSH Halo DEVELOPMENT', usageLimitEnabled: false });
    if (typeof key.key !== 'string' || !key.key) throw new Error('Gateway did not return the new development key.');
    secret = { ...secret, apiKey: key.key, apiKeyId: key.id };
    await saveSecret(secret);
  }

  const nodesResponse = await request('/api/provider-nodes');
  if (!Array.isArray(nodesResponse.nodes)) throw new Error('Unexpected provider-node response.');
  let localNode = nodesResponse.nodes.find(node => node.prefix === 'halo-local');
  if (!localNode) {
    const created = await request('/api/provider-nodes', 'POST', {
      name: 'Halo local models — connection pending', prefix: 'halo-local',
      apiType: 'chat', type: 'openai-compatible', baseUrl: 'http://127.0.0.1:1234/v1',
    });
    localNode = created.node;
  }
  if (!localNode?.id) throw new Error('Local provider definition was not returned.');
  const catalog = await request('/api/models?all=true');
  if (!Array.isArray(catalog.models)) throw new Error('Unexpected all-model catalog response.');
  const connectionResponse = await request('/api/providers');
  const connections = connectionResponse.connections ?? connectionResponse.providers;
  if (!Array.isArray(connections)) throw new Error('Unexpected provider connection response.');
  // Whitelist descriptive fields. Never serialize complete provider/key responses.
  const models = catalog.models.map(model => ({
    id: model.id ?? model.value ?? null, provider: model.provider ?? null,
    model: model.model ?? null, name: model.name ?? model.label ?? null,
    contextWindow: model.contextWindow ?? null,
  }));
  const requiredFamilies = {
    deepseek: ['ds', 'deepseek'], kimi: ['moonshot', 'kimi', 'kmc', 'kmca'],
    glm: ['glm', 'zai', 'glmcn', 'glmt'], claude: ['cc', 'claude', 'anthropic'],
    codex: ['cx', 'codex', 'cxa', 'codex-app-server'],
    // Installed apikey/frontier-labs.ts: Gemini id/alias is 'gemini'.
    // oauth.ts assigns 'gc' to Grok Build; guessed aliases misreport the catalog.
    gemini: ['gemini'],
  };
  return {
    capturedUtc: new Date().toISOString(), origin, packageVersion: '3.8.50',
    evidence: 'Live development management API; built-in catalog, not authenticated provider or model-execution proof.',
    cloudSyncEnabled: settings.cloudEnabled,
    cloudConfigured: settings.cloudConfigured ?? null,
    cloudSyncCanSend,
    localNode: { id: localNode.id, prefix: localNode.prefix, baseUrl: localNode.baseUrl, connectionCreated: false },
    gatewayKeyCreated: Boolean(secret.apiKey),
    families: Object.fromEntries(Object.entries(requiredFamilies).map(([family, ids]) => [family, {
      catalogModelCount: models.filter(model => ids.includes(model.provider)).length,
      authenticatedHere: false,
    }])),
    connections: connections.map(c => ({ id: c.id, provider: c.provider, isActive: c.isActive })),
    modelCount: models.length, models,
  };
}

async function main() {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  if (path.basename(repo) !== 'dsh-halo-dev') throw new Error('Run only from the separate dsh-halo-dev checkout.');
  const receipt = JSON.parse(readFileSync(path.join(repo, '.runtime', 'omniroute', 'launcher.json'), 'utf8').replace(/^\uFEFF/, ''));
  if (receipt.owner !== 'dsh-halo-dev' || receipt.port !== 20129) throw new Error('Development provider ownership receipt does not match.');
  const credentialFile = path.join(repo, '.runtime', 'credentials', 'provider-admin.json');
  const evidenceFile = path.join(repo, '.runtime', 'evidence', 'provider-catalog.json');
  const secret = existsSync(credentialFile) ? JSON.parse(readFileSync(credentialFile, 'utf8')) : {};
  if (secret.origin && secret.origin !== origin) throw new Error('Credential origin does not match this development gateway.');
  const snapshot = await configureProvider({ secret, saveSecret: value => {
    mkdirSync(path.dirname(credentialFile), { recursive: true });
    writeFileSync(credentialFile, JSON.stringify(value, null, 2), { mode: 0o600 });
  } });
  mkdirSync(path.dirname(evidenceFile), { recursive: true });
  writeFileSync(evidenceFile, JSON.stringify(snapshot, null, 2));
  console.log(JSON.stringify({ evidenceFile, credentialFile, modelCount: snapshot.modelCount,
    families: snapshot.families, connections: snapshot.connections.length, cloudSyncEnabled: snapshot.cloudSyncEnabled,
    cloudConfigured: snapshot.cloudConfigured, cloudSyncCanSend: snapshot.cloudSyncCanSend,
    upstreamCallsMadeByThisScript: false }, null, 2));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
