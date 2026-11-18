import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

export const name = 'halo-strata-auto-start';
export const inject = ['llm', 'agents', 'agentPresets'];

const model = 'qwen3.8-flash-next-iq3_s';
const routes = {
  'strata-halo-auto': { port: 8081, script: 'halo.py', state: 'halo-state.json', waitMs: 495_000 },
  // Leave the engine's 480-second startup limit intact and allow 125 seconds for Windows prefetch.
  'strata-halo-capped': { port: 8083, script: 'halo.py', args: ['--capped'], state: 'halo-capped-state.json', waitMs: 620_000 },
  'strata-5070ti': { port: 8082, script: 'worker.py', state: 'state.json', waitMs: 210_000 },
};
const presetLeads = new Map([
  ['local-5070', 'strata-halo-auto'],
  ['local-5070-capped', 'strata-halo-capped'],
]);

async function ready({ port }) {
  const base = `http://127.0.0.1:${port}`;
  try {
    const [health, list] = await Promise.all(['/health', '/v1/models'].map(path =>
      fetch(base + path, { signal: AbortSignal.timeout(1500), redirect: 'error' })));
    if (!health.ok || !list.ok || (await health.json()).status !== 'ok') return false;
    if (port === 8083) {
      const state = await readState(routes['strata-halo-capped']);
      if (state.status !== 'ready' || !(Date.now() / 1000 - state.started < state.maxSeconds)
          || !(state.workingSetCaps?.length >= 2)) return false;
    }
    return (await list.json()).data.some(entry => entry.id === model);
  } catch {
    return false;
  }
}

async function readState(route) {
  try {
    return JSON.parse(await readFile(new URL(route.state, import.meta.url), 'utf8'));
  } catch {
    return {};
  }
}

async function startAndWait(route, logger) {
  if (await ready(route)) return;
  const before = await readState(route);
  const invokedAt = Date.now();
  const configFile = process.env.DSH_STRATA_CONFIG ?? new URL('settings.json', import.meta.url);
  const { python } = JSON.parse((await readFile(configFile, 'utf8')).replace(/^\uFEFF/, ''));
  if (typeof python !== 'string' || !python) throw new Error('Set python in the Strata settings file');
  const child = spawn(python,
    ['-B', fileURLToPath(new URL(route.script, import.meta.url)), 'start', ...(route.args ?? [])],
    { detached: true, windowsHide: true, stdio: 'ignore' });
  let launchError;
  let exitStatus;
  child.on('error', error => { launchError = error; });
  child.on('exit', code => { exitStatus = code; });
  child.unref();
  logger.info('Checking Strata startup on loopback port %s', route.port);
  while (Date.now() - invokedAt < route.waitMs) {
    if (launchError) throw launchError;
    if (await ready(route)) return;
    const state = await readState(route);
    const updated = state.started !== before.started || state.error !== before.error;
    if (updated && state.status === 'error') throw new Error(state.error);
    if (exitStatus !== undefined && exitStatus !== 0 && state.status !== 'starting') {
      throw new Error(state.error || `Strata launcher exited with code ${exitStatus}; check its startup log`);
    }
    await delay(1000);
  }
  throw new Error(`Strata on port ${route.port} did not become ready before its startup deadline`);
}

export function wrapAdapter(adapter, ensure) {
  if (typeof adapter.streamWithSnapshot !== 'function') throw new Error('Reverify the Strata auto-start adapter with this DSH version');
  const original = adapter.streamWithSnapshot;
  const wrapped = async function* (options, snapshot) {
    const route = Object.hasOwn(routes, options.provider) ? routes[options.provider] : undefined;
    if (route && options.model === model) {
      options.signal?.throwIfAborted();
      await ensure(route, options.signal);
      options.signal?.throwIfAborted();
    }
    yield* original.call(this, options, snapshot);
  };
  adapter.streamWithSnapshot = wrapped;
  return () => { if (adapter.streamWithSnapshot === wrapped) adapter.streamWithSnapshot = original; };
}

export function installPresetLeads(ctx) {
  const applied = new WeakMap();
  function select(agent, preset) {
    const turn = ctx.agents.turnBoundaryOf(agent.session);
    if (turn.lastTurn !== 0 || turn.openTurnStartSeq !== null) return;
    const provider = presetLeads.get(preset);
    const previous = applied.get(agent);
    if (provider) {
      const before = previous?.before ?? agent.model.current();
      agent.model.select({ provider, model });
      applied.set(agent, { before, provider });
    } else if (previous) {
      if (previous.before && agent.model.current()?.provider === previous.provider) {
        agent.model.select(previous.before);
      }
      applied.delete(agent);
    }
  }
  ctx.on('agent/created', ({ agent }) => {
    if (agent.model.recordedSelection() == null) {
      select(agent, ctx.agentPresets.presetForSession(agent.session));
    }
  });
  ctx.on('agent-preset/selected', (id, preset) => {
    // Selection was emitted while the preset event was appended to the log.
    queueMicrotask(() => {
      const agent = ctx.agents.get(id);
      if (agent && ctx.agentPresets.presetForSession(agent.session) === preset) select(agent, preset);
    });
  });
}

export function apply(ctx) {
  installPresetLeads(ctx);
  const installed = new Map();
  const starting = new Map();
  function ensure(route, signal) {
    if (!starting.has(route.port)) {
      const pending = startAndWait(route, ctx.logger).finally(() => starting.delete(route.port));
      starting.set(route.port, pending);
    }
    const pending = starting.get(route.port);
    if (!signal) return pending;
    return new Promise((resolve, reject) => {
      const abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
      pending.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
  }
  function install() {
    for (const provider of ctx.llm.listProviders()) {
      if (!Object.hasOwn(routes, provider.id)) continue;
      const adapter = ctx.llm.registration(provider.id).adapter;
      if (!installed.has(adapter)) installed.set(adapter, wrapAdapter(adapter, ensure));
    }
  }
  ctx.on('llm/adapters-updated', install);
  ctx.on('dispose', () => { for (const restore of installed.values()) restore(); });
  install();
}
