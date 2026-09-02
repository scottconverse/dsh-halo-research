import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const missionControlFile = process.env.HALO_MC_SOURCE_UNDER_TEST
  ? path.resolve(process.env.HALO_MC_SOURCE_UNDER_TEST)
  : path.join(here, '..', 'mission-control.mjs');
const source = fs.readFileSync(missionControlFile, 'utf8');

function extractFunction(name) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  assert.ok(match, `${name} function is present`);
  const open = source.indexOf('{', match.index);
  assert.notEqual(open, -1, `${name} function has a body`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, i + 1);
    }
  }
  assert.fail(`${name} function body is balanced`);
}

function sliceBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.notEqual(start, -1, `start marker is present: ${startMarker}`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `end marker is present after ${startMarker}: ${endMarker}`);
  return text.slice(start, end);
}

test('configured DSH route is distinct from exact resident Brain and Worker roles', () => {
  const loaderUi = extractFunction('applyLoaderLabels');
  const violations = [];
  if (!/Configured DSH route/i.test(source)) {
    violations.push('the settings UI does not label the configured route as "Configured DSH route"');
  }
  if (!/Resident Brain/i.test(loaderUi)) {
    violations.push('the model slots do not label the exact resident Brain role');
  }
  if (!/Resident Worker/i.test(loaderUi)) {
    violations.push('the model slots do not label the exact resident Worker role');
  }
  const usesResolvedRoles = /s\.(?:residentRoles|roles)\.(?:brain|worker)/.test(loaderUi);
  const matchesExactIdentifiers = /identifier\s*===\s*s\.(?:loaders|roleProfiles|roles)[\s\S]*(?:brain|worker)[\s\S]*identifier/.test(loaderUi);
  if (!usesResolvedRoles && !matchesExactIdentifiers) {
    violations.push('resident role assignment is not supplied by the backend or matched by exact configured identifier');
  }
  assert.deepEqual(violations, []);
});

test('resident Brain is never inferred by the absence of coder in its identifier', () => {
  const loaderUi = extractFunction('applyLoaderLabels');
  assert.doesNotMatch(loaderUi, /\/coder\/i/);
  assert.doesNotMatch(loaderUi, /!\s*\/coder\/i/);
});

test('model actions report response-driven success and failure outcomes', () => {
  const violations = [];
  for (const name of ['act', 'loadModel', 'unloadModel']) {
    const body = extractFunction(name);
    const response = /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+postAction\b/.exec(body);
    if (!response) {
      violations.push(`${name} does not retain the POST response`);
    } else if (!new RegExp(`\\b${response[1]}\\.ok\\b`).test(body)) {
      violations.push(`${name} does not branch on response.ok`);
    }
    if (!/catch\s*\(/.test(body)) violations.push(`${name} has no network/error path`);
    if (!/(?:could not|failed|failure|refused|error)/i.test(body)) {
      violations.push(`${name} has no operator-visible failure wording`);
    }
    if (!/(?:completed|succeeded|started|loaded|unloaded|stopped|done)/i.test(body)) {
      violations.push(`${name} has no operator-visible success wording`);
    }
  }
  assert.deepEqual(violations, []);
});

test('destructive unloads confirm exact targets and huge-context loads warn explicitly', () => {
  const globalAction = extractFunction('act');
  const rowUnload = extractFunction('unloadModel');
  const violations = [];
  if (!/unload-all[\s\S]*confirm\s*\(/.test(globalAction)) {
    violations.push('Unload All does not ask for confirmation');
  }
  if (!/unload-worker[\s\S]*confirm\s*\(/.test(globalAction)) {
    violations.push('Unload Worker does not ask for confirmation');
  }
  if (!/confirm\s*\(/.test(rowUnload)) {
    violations.push('row-level Unload does not ask for confirmation');
  }
  const load = extractFunction('loadModel');
  if (!/(?:200000|200_000)[\s\S]{0,300}confirm\s*\(/.test(load)) {
    violations.push('a requested context at the documented huge-context threshold has no explicit warning');
  }
  assert.deepEqual(violations, []);
});

test('Unload Worker posts the exact confirmed resident identifier instead of a static alias action', () => {
  const action = extractFunction('act');
  assert.match(action, /unload-worker[\s\S]*\/api\/action\/unload-model/);
  assert.match(action, /identifier\s*:\s*(?:targets\[0\]|worker)\.identifier/);
  const actionsBlock = sliceBetween(source, 'const ACTIONS = {', '};');
  assert.doesNotMatch(actionsBlock, /['"]unload-worker['"]\s*:/);
});

test('model mutations are acknowledged only after subprocess exit and residency corroboration', () => {
  const server = source.slice(0, source.indexOf('const PAGE'));
  assert.match(server, /async function runLmsMutation/);
  assert.match(server, /await\s+safeExecFile\(\s*['"]lms['"]/);
  assert.match(server, /await\s+waitForModelState/);
  const loadRoute = sliceBetween(source, "if (req.method === 'POST' && url.pathname === '/api/action/load-model')", "if (req.method === 'POST' && url.pathname === '/api/action/unload-model')");
  const unloadRoute = sliceBetween(source, "if (req.method === 'POST' && url.pathname === '/api/action/unload-model')", '// Stop ONE session');
  assert.doesNotMatch(loadRoute, /safeSpawn\(/);
  assert.doesNotMatch(unloadRoute, /safeSpawn\(/);
  assert.match(loadRoute, /await\s+runLmsMutation/);
  assert.match(unloadRoute, /await\s+runLmsMutation/);
});

test('today activity labels disclose updated-session selection and cumulative counters', () => {
  const overview = extractFunction('renderOverview');
  const sessions = sliceBetween(source, 'async function loadSessions(){', 'function toggleSessionDetail');
  const violations = [];
  for (const [surface, body] of [['Overview', overview], ['Sessions', sessions]]) {
    if (/sessions? today/i.test(body)) {
      violations.push(`${surface} says "sessions today" although selection is by session-file update time`);
    }
    if (/(?:kTok\s+in\s*\/\s*out|K\s+in\s*\/\s*[^\n]*out)\s+today/i.test(body)) {
      violations.push(`${surface} says token counters are today's usage although they are cumulative session totals`);
    }
    if (!/updated today/i.test(body)) {
      violations.push(`${surface} does not say that the selected session files were updated today`);
    }
    if (!/cumulative/i.test(body)) {
      violations.push(`${surface} does not label the summed counters as cumulative`);
    }
  }
  assert.deepEqual(violations, []);
});

test('a null TTL describes automatic unload policy rather than storage location', () => {
  const fmtTtlSource = extractFunction('fmtTtl');
  const fmtTtl = new Function(`${fmtTtlSource}; return fmtTtl;`)();
  const value = fmtTtl(null, Date.now());
  assert.match(value, /(?:no automatic unload|auto-unload (?:off|disabled)|TTL (?:disabled|not set)|not scheduled to unload|stays resident)/i);
  assert.doesNotMatch(value, /disk/i);
});

test('component-only catalog rows cannot expose standalone Load actions', () => {
  const models = extractFunction('loadModels');
  const kindAt = models.indexOf('var kind=');
  const actionAt = models.indexOf('var actionCell=');
  const guardedAction = /var\s+actionCell\s*=\s*kind\s*\?|if\s*\(\s*kind\s*\)[\s\S]{0,250}actionCell\s*=/.test(models);
  const violations = [];
  if (kindAt === -1 || actionAt === -1 || kindAt > actionAt) {
    violations.push('component kind is classified only after the Load action is built');
  }
  if (!guardedAction) {
    violations.push('actionCell is not suppressed when kind marks an embedding, vision component, draft head, or metadata row');
  }
  assert.deepEqual(violations, []);
});

test('a full language model with MTP in its name retains its Load action', async () => {
  const elements = new Map();
  const load = new Function('fetch', 'document', 'esc', 'fmtK', 'fmtTtl', `var modelsCache=[],lastStatus=null; ${extractFunction('loadModels')}; return loadModels;`)(
    async () => ({ json: async () => ({ error: false, catalog: [{
      modelKey: 'ornith-35b-mtp', displayName: 'Full language model', architecture: 'qwen35moe',
      originKind: 'local', loaded: false, sizeGB: 15.2, quant: 'Q4_K_M',
    }], localCount: 1, fleetCount: 0, localDiskGiB: 15.2, localDiskFiles: 1, fleetCatalogGB: 0 }) }),
    { getElementById: id => { if (!elements.has(id)) elements.set(id, { checked: false, innerHTML: '', textContent: '' }); return elements.get(id); } },
    String, String, () => '',
  );
  await load();
  const table = elements.get('models-table').innerHTML;
  assert.ok(/showLoadRow/.test(table), 'a supported full language-model architecture must remain loadable regardless of MTP branding');
  assert.doesNotMatch(table, /component only|draft head/);
});

test('Prefill last-run row is absent unless a real backend field feeds it', () => {
  const pageStart = source.indexOf('const PAGE');
  assert.notEqual(pageStart, -1, 'PAGE template is present');
  const serverSource = source.slice(0, pageStart);
  const hasPrefillRow = /Prefill, last run/.test(source.slice(pageStart));
  const mapsPrefill = /\bprefillTps\s*:/.test(serverSource);
  assert.ok(!hasPrefillRow || mapsPrefill, 'Prefill row is dead: no server response maps prefillTps');
});

test('failed validation makes the watched status non-nominal', () => {
  const lights = extractFunction('computeLights');
  const violations = [];
  if (!/s\.validation\b/.test(lights)) {
    violations.push('computeLights ignores validation state');
  }
  if (!/(?:validation[\s\S]{0,500}level\s*:\s*['"](?:a|r)|level\s*:\s*['"](?:a|r)[\s\S]{0,500}validation)/i.test(lights)) {
    violations.push('a failed validation has no amber/red status outcome');
  }
  assert.deepEqual(violations, []);
});

test('stale plugin inventory is visibly labeled as last-known', () => {
  assert.match(source, /Showing last-known plugin inventory/);
  assert.match(source, /pluginsData\.stale/);
  assert.match(source, /pluginsData\.refreshError/);
});

test('stale validation cannot keep the status strip nominal', () => {
  const lights = extractFunction('computeLights');
  const hasFreshnessInput = /s\.validation(?:\.[A-Za-z_$][\w$]*){0,2}[\s\S]{0,200}(?:stale|fresh|age|checked|when)|(?:stale|fresh|age|checked|when)[\s\S]{0,200}s\.validation/i.test(lights);
  const hasStaleOutcome = /(?:stale|expired|too old)[\s\S]{0,250}level\s*:\s*['"](?:a|r)|level\s*:\s*['"](?:a|r)[\s\S]{0,250}(?:stale|expired|too old)/i.test(lights);
  assert.ok(hasFreshnessInput && hasStaleOutcome, 'computeLights must turn stale validation evidence amber/red');
});

test('route hazards and broken persistence cadence cannot keep watched lights green', () => {
  const computeLightsSource = extractFunction('computeLights');
  const computeLights = new Function('fmtDur', `${computeLightsSource}; return computeLights;`)(ms => `${ms}ms`);
  const base = {
    stalledSessions: { count: 0, items: [] },
    services: { cockpit: true, lmsCli: true },
    dshData: { cacheState: 'current' },
    plugins: { cacheState: 'current', failed: 0, stuck: 0 },
    presets: [], contextPressure: null,
    models: [{ identifier: 'brain', originKind: 'local', status: 'idle', context: 32768 }],
    fleet: { unknownOriginResident: [], unknownOriginGenerating: [] },
    brainConfigMismatch: null,
    routeRuntime: { configured: 'lmstudio/brain', exactResident: true, ambiguous: false, configError: null },
    gpu: { ok: true, sharedGiB: 1 }, ram: { freeGiB: 32 }, disk: { ok: true, freeGB: 500 },
    jobs: { streamConnected: true },
    memory: {
      ok: true,
      writer: { configured: true, active: true, cacheState: 'current' },
      snapshotTask: { configured: true, state: 'Ready' },
      snapshots: { ok: true, overdue: false },
    },
    validation: { ok: true, freshness: { state: 'current' } },
  };
  assert.equal(computeLights(base).MODELS.level, 'g');
  assert.equal(computeLights(base).STORE.level, 'g');
  assert.notEqual(computeLights({ ...base, routeRuntime: { configError: 'settings unreadable' } }).MODELS.level, 'g');
  assert.notEqual(computeLights({ ...base, routeRuntime: { configured: 'lmstudio/brain', ambiguous: true } }).MODELS.level, 'g');
  assert.notEqual(computeLights({ ...base, memory: { ...base.memory, snapshots: { ok: true, overdue: true } } }).STORE.level, 'g');
  assert.notEqual(computeLights({ ...base, memory: { ...base.memory, snapshotTask: { configured: false, state: null } } }).STORE.level, 'g');
});

test('overview uses server-proven completed runs and names the real hourly snapshot cadence', () => {
  const overview = extractFunction('renderOverview');
  assert.match(overview, /s\.latestCompletedRun/);
  assert.doesNotMatch(overview, /s\.sessions\.filter\(function\(x\)\{return x\.decodeTps!=null/);
  assert.match(overview, /last memory snapshot/i);
  assert.match(overview, /next snapshot expected/i);
  assert.doesNotMatch(overview, /delta-scan/i);
  assert.match(overview, /validationFreshness\.state===['"]never['"]/);
  assert.match(source, /no completed-run observation/i);
  assert.doesNotMatch(source, /decode[^\n]{0,120}['"]idle['"]/i);
});

test('memory help text describes conditional writer and snapshot capabilities without promising absent services', () => {
  const about = sliceBetween(source, '<summary>About this graph</summary>', '</details>');
  assert.doesNotMatch(about, /It grows when sessions write to it/i);
  assert.doesNotMatch(about, /It['’]s snapshotted hourly/i);
  assert.match(about, /when the DSH memory writer is active/i);
  assert.match(about, /HALO Memory Snapshot<\/span> task is configured/i);
  assert.match(about, /live status/i);
});

test('the five-second status update refreshes Memory status and checks graph changes', async () => {
  let memoryStatusCalls = 0;
  let graphRefreshCalls = 0;
  const memory = { ok: true, file: 'memory.json', mtimeMs: 1234 };
  const refresh = new Function(
    'fetch', 'document', 'renderStrip', 'applyLoaderLabels', 'renderOverview', 'renderSystem', 'renderMemoryStatus', 'refreshMemoryGraphIfChanged',
    `var currentTab='memory',lastStatus=null; ${extractFunction('refreshStatus')}; return refreshStatus;`,
  )(
    async () => ({ json: async () => ({ time: new Date().toISOString(), memory }) }),
    { getElementById: () => ({ textContent: '' }) }, () => {}, () => {}, () => {}, () => {},
    value => { assert.equal(value, memory); memoryStatusCalls++; },
    value => { assert.equal(value, memory); graphRefreshCalls++; },
  );
  await refresh();
  assert.equal(memoryStatusCalls, 1, 'Memory connection status must update from the latest status response');
  assert.equal(graphRefreshCalls, 1, 'Memory graph must observe the backing file version on every visible poll');
});

test('unchanged Memory refresh preserves graph layout and selection', async () => {
  const graph = { ok: true, file: 'memory.json', mtimeMs: 1234, entities: [{ name: 'one', entityType: 'probe', observations: [] }], relations: [] };
  const versionKey = value => JSON.stringify([value.file || null, value.mtimeMs ?? null, value.ok === true, value.error || null]);
  const mg = { initialized: true, loadedVersion: versionKey(graph), graphStatus: 'No relations yet', selected: 'one', nodes: [{ id: 'one', x: 42, y: 84 }] };
  let rebuilds = 0;
  const elements = new Map();
  const noop = () => {};
  const load = new Function(
    'fetch', 'document', 'mg', 'memoryVersionKey', 'clearMemoryGraphState', 'mgColorFor', 'esc', 'initMemoryGraphDom', 'mgSeedPositions', 'buildMemoryGraphElements', 'applyMgTransform', 'mgApplyHighlight', 'mgStartSim', 'requestAnimationFrame', 'mgOnTabActivated',
    `${extractFunction('loadMemoryGraphTab')}; return loadMemoryGraphTab;`,
  )(
    async () => ({ ok: true, json: async () => graph }),
    { getElementById: id => { if (!elements.has(id)) elements.set(id, { textContent: '', innerHTML: '' }); return elements.get(id); } },
    mg, versionKey, noop, () => 'teal', String, noop, noop, () => { rebuilds++; }, noop, noop, noop, noop, noop,
  );
  await load();
  assert.equal(rebuilds, 0, 'unchanged source must not rebuild graph nodes');
  assert.equal(mg.selected, 'one');
  assert.deepEqual(mg.nodes, [{ id: 'one', x: 42, y: 84 }]);
  assert.equal(elements.get('mg-status').textContent, 'No relations yet');
});

test('Memory graph refits settled node positions after a desktop-to-mobile resize', () => {
  const node = { id: 'one', x: 800, y: 250, vx: 0, vy: 0 };
  const mg = {
    initialized: true, didInitialFit: true, w: 1600, h: 500,
    nodes: [node], edges: [], byId: { one: node }, selected: 'one',
    tx: 0, ty: 0, k: 1, dragNode: null,
    svg: { setAttribute() {} },
  };
  const mgSim = { running: false, rafId: null, lowFrames: 0, frames: 0 };
  const frames = [];
  const canvas = { clientWidth: 390, clientHeight: 500 };
  const constants = sliceBetween(source, 'var MG_IDEAL_K_CAP=', 'var mg=');
  const activate = new Function(
    'mg', 'mgSim', 'document', 'requestAnimationFrame', 'applyMgTransform', 'mgUpdatePositions', 'loadMemoryGraphTab',
    `${constants}\n${['mgOnTabActivated', 'mgFitToView', 'mgStartSim', 'mgTick'].map(extractFunction).join('\n')}; return mgOnTabActivated;`,
  )(
    mg, mgSim, { getElementById: () => canvas }, callback => frames.push(callback), () => {}, () => {},
    () => assert.fail('a resize must not rebuild the loaded graph'),
  );

  activate();
  let iterations = 0;
  while (frames.length && iterations++ < 4000) frames.shift()();

  assert.equal(mgSim.running, false, 'the real graph physics must finish settling');
  assert.equal(frames.length, 0, 'the test must consume the complete simulation');
  const radius = 15 * mg.k;
  const screenX = node.x * mg.k + mg.tx;
  const screenY = node.y * mg.k + mg.ty;
  assert.ok(screenX - radius >= 0 && screenX + radius <= mg.w, `settled node is clipped horizontally at ${screenX}`);
  assert.ok(screenY - radius >= 0 && screenY + radius <= mg.h, `settled node is clipped vertically at ${screenY}`);
  assert.equal(mg.selected, 'one', 'responsive fitting must preserve the selected node');

  const settledView = { x: node.x, y: node.y, tx: mg.tx, ty: mg.ty, k: mg.k };
  activate();
  assert.equal(frames.length, 0, 'normal unchanged-size activation must not restart the simulation');
  assert.deepEqual({ x: node.x, y: node.y, tx: mg.tx, ty: mg.ty, k: mg.k }, settledView);
});

test('Memory tab contains the promised writer, task, and snapshot status surface', () => {
  const panel = sliceBetween(source, '<div id="tab-memory"', '<script>');
  assert.ok(/id="mg-health"/.test(panel), 'the promised Memory connection status surface must exist');
  assert.match(panel, /aria-live="polite"/);
});

test('Memory graph refreshes for changed backing files but never overlaps a pending refresh', () => {
  const memory = { file: 'memory.json', mtimeMs: 1234, ok: true, error: null };
  const mg = {};
  let requests = 0;
  const api = new Function('mg', 'loadMemoryGraphTab', `${extractFunction('memoryVersionKey')}\n${extractFunction('refreshMemoryGraphIfChanged')}; return {memoryVersionKey,refreshMemoryGraphIfChanged};`)(mg, () => { requests++; });
  mg.loadedVersion = api.memoryVersionKey(memory);
  api.refreshMemoryGraphIfChanged(memory);
  assert.equal(requests, 0);
  api.refreshMemoryGraphIfChanged({ ...memory, mtimeMs: 2345 });
  assert.equal(requests, 1);
  mg.loading = true;
  api.refreshMemoryGraphIfChanged({ ...memory, mtimeMs: 3456 });
  assert.equal(requests, 1);
  mg.loading = false;
  api.refreshMemoryGraphIfChanged({ ...memory, ok: false, mtimeMs: null, error: 'not configured' });
  assert.equal(requests, 2);
});

test('Memory status names degraded writer, failed task, and missing snapshots without claiming success', () => {
  const element = { innerHTML: '' };
  const render = new Function('document', 'fmtStamp', 'esc', `${extractFunction('renderMemoryStatus')}; return renderMemoryStatus;`)(
    { getElementById: () => element }, value => value || 'never', value => String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
  );
  render({ ok: false, error: 'unreadable', writer: { cacheState: 'stale', error: '<bad>' }, snapshotTask: { configured: true, state: 'Ready', lastTaskResult: 1 }, snapshots: { ok: false, error: 'no snapshots' } });
  assert.match(element.innerHTML, /unreadable/);
  assert.match(element.innerHTML, /status stale: &lt;bad&gt;/);
  assert.match(element.innerHTML, /last result 1/);
  assert.match(element.innerHTML, /no snapshots/);
  assert.doesNotMatch(element.innerHTML, /on schedule|<bad>/);
});

test('state-changing authorization requires a token and an exact Mission Control origin', () => {
  const authorize = new Function(
    'ACTION_TOKEN',
    'PORT',
    `${extractFunction('actionAuthorized')}; return actionAuthorized;`,
  )('secret', 3090);
  const request = headers => ({ headers });

  assert.equal(authorize(request({ 'x-mc-token': 'secret', origin: 'http://127.0.0.1:3090' })), true);
  assert.equal(authorize(request({ 'x-mc-token': 'secret', referer: 'http://localhost:3090/#models' })), true);
  assert.equal(authorize(request({ 'x-mc-token': 'wrong', origin: 'http://127.0.0.1:3090' })), false);
  assert.equal(authorize(request({ 'x-mc-token': 'secret' })), false, 'headerless POST must fail closed');
  assert.equal(authorize(request({ 'x-mc-token': 'secret', origin: 'http://127.0.0.1:3090.evil.example' })), false);
  assert.equal(authorize(request({ 'x-mc-token': 'secret', referer: 'http://localhost:3090.evil.example/' })), false);
});

test('unknown URL hashes fall back to Overview before any panel is hidden', () => {
  const showTab = extractFunction('showTab');
  const guard = /(?:allowedTabs|tabNames|validTabs)[\s\S]{0,300}(?:includes|indexOf)[\s\S]{0,120}overview/.exec(showTab);
  assert.ok(guard, 'showTab must normalize an unknown tab to overview');
  const normalizeAt = Math.min(
    ...['allowedTabs', 'tabNames', 'validTabs'].map(name => showTab.indexOf(name)).filter(index => index >= 0),
  );
  const hideAt = showTab.indexOf("document.querySelectorAll('.tabpanel')");
  assert.ok(normalizeAt >= 0 && normalizeAt < hideAt, 'unknown-tab fallback runs before panel visibility changes');
});

test('memory API errors clear stale graph DOM, selection, data, and animation state', () => {
  const loader = extractFunction('loadMemoryGraphTab');
  const errorBranch = sliceBetween(loader, 'if(!g.ok)', 'var entities=');
  const cleanupCall = /\b(clearMemoryGraph[A-Za-z_$]*)\s*\(/.exec(errorBranch);
  const cleanup = cleanupCall ? extractFunction(cleanupCall[1]) : errorBranch;
  const required = [
    ['detail panel', /mg-detail/],
    ['node collection', /mg\.nodes\s*=\s*\[\s*\]/],
    ['edge collection', /mg\.edges\s*=\s*\[\s*\]/],
    ['identifier map', /mg\.byId\s*=\s*\{\s*\}/],
    ['selection', /mg\.selected\s*=\s*null/],
    ['initialized flag', /mg\.initialized\s*=\s*false/],
    ['animation', /(?:mgStopSim\s*\(|mgSim\.running\s*=\s*false|cancelAnimationFrame\s*\()/],
  ];
  const missing = required.filter(([, pattern]) => !pattern.test(cleanup)).map(([label]) => label);
  assert.deepEqual(missing, [], 'g.ok=false must clear every stale graph surface and state holder');
});

test('tabs expose complete ARIA tablist, tab, and tabpanel relationships', () => {
  const nav = sliceBetween(source, '<nav class="tabs"', '</nav>');
  const tabButtons = [...nav.matchAll(/<button\b[^>]*class="tabbtn"[^>]*>/g)].map(match => match[0]);
  const panels = [...source.matchAll(/<div\b[^>]*id="tab-[^"]+"[^>]*class="tabpanel"[^>]*>/g)].map(match => match[0]);
  const showTab = extractFunction('showTab');
  const violations = [];
  if (!/role="tablist"/.test(nav)) violations.push('tab navigation has no role="tablist"');
  if (!/aria-label=/.test(nav)) violations.push('tab navigation has no accessible name');
  if (!tabButtons.length || !tabButtons.every(button => /role="tab"/.test(button))) {
    violations.push('every tab button must have role="tab"');
  }
  if (!tabButtons.length || !tabButtons.every(button => /id="[^"]+"/.test(button) && /aria-controls="[^"]+"/.test(button))) {
    violations.push('every tab button must identify and control its panel');
  }
  if (!panels.length || !panels.every(panel => /role="tabpanel"/.test(panel) && /aria-labelledby="[^"]+"/.test(panel))) {
    violations.push('every tabpanel must reference its tab');
  }
  if (!/aria-selected/.test(showTab)) violations.push('showTab does not update aria-selected');
  if (!/(?:\.hidden\s*=|setAttribute\s*\(\s*['"]hidden)/.test(showTab)) {
    violations.push('showTab does not expose inactive panels as hidden');
  }
  assert.deepEqual(violations, []);
});

test('clickable status, filter, row, and graph controls are keyboard operable', () => {
  const graphElements = extractFunction('buildMemoryGraphElements');
  const offenders = [
    ['status lights', /<span class="light-item"[^>]*onclick=/],
    ['plugin filter chips', /<span class="pchip[^>]*onclick=/],
    ['session detail rows', /<tr class="clickable"[^>]*onclick=/],
    ['memory list rows', /<div class="row clickable"[^>]*onclick=/],
  ].filter(([, pattern]) => pattern.test(source)).map(([label]) => label);
  if (!/setAttribute\(\s*['"]tabindex['"]\s*,\s*['"]0['"]\s*\)/.test(graphElements) ||
      !/addEventListener\(\s*['"]keydown['"]/.test(graphElements)) {
    offenders.push('memory graph nodes');
  }
  assert.deepEqual(offenders, [], 'click-only non-native controls must become buttons/links or implement keyboard semantics');
});

test('dynamic operator messages are announced to assistive technology', () => {
  const violations = [];
  for (const id of ['strip', 'actionMsg', 'sys-validate', 'mg-status']) {
    const element = new RegExp(`<[^>]+id=["']${id}["'][^>]*>`).exec(source)?.[0] || '';
    if (!/role=["'](?:status|alert)["']/.test(element) || !/aria-live=/.test(element)) {
      violations.push(`${id} lacks role=status/alert plus aria-live`);
    }
  }
  assert.deepEqual(violations, []);
});

test('data-backed tabs render explicit initial loading and successful empty states', () => {
  const violations = [];
  for (const id of ['strip', 'ov-services', 'models-table', 'sessions-table', 'plugins-table']) {
    const initial = new RegExp(`<[^>]+id=["']${id}["'][^>]*>([^<]*)`).exec(source)?.[1] || '';
    if (!/(?:loading|checking|waiting)/i.test(initial)) violations.push(`${id} has a blank initial state`);
  }
  const emptyContracts = [
    ['Models', extractFunction('loadModels'), /No (?:local )?(?:models|catalog entries)/i],
    ['Sessions', sliceBetween(source, 'async function loadSessions(){', 'function toggleSessionDetail'), /No sessions/i],
    ['Plugins', extractFunction('renderPlugins'), /No plugins/i],
  ];
  for (const [surface, body, emptyCopy] of emptyContracts) {
    if (!emptyCopy.test(body)) violations.push(`${surface} has no explicit successful-empty message`);
  }
  assert.deepEqual(violations, []);
});

test('mobile tab overflow has a visible cue and keeps the active tab in view', () => {
  const mobileCss = sliceBetween(source, '@media(max-width:700px){', '</style>');
  const showTab = extractFunction('showTab');
  const violations = [];
  if (!/(?:scrollbar|mask-image|overflow-cue|tabs::after)/i.test(mobileCss)) {
    violations.push('horizontal tab overflow has no visible affordance');
  }
  if (!/scrollIntoView\s*\(/.test(showTab)) {
    violations.push('the selected tab is not scrolled into the mobile viewport');
  }
  assert.deepEqual(violations, []);
});
