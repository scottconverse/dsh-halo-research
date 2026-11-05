// Web bridge to the installed pi-ai onPayload hook. No transport replacement.
// streamWithSnapshot is an internal DSH seam: reverify this plugin after DSH upgrades.
import { writeFileSync } from 'node:fs';
export const name = 'halo-web-qwen27-sampling';
export const inject = ['llm'];
const routes = new Set(['lmstudio-library', 'lmstudio-qwen38', 'web-fallback']);
const ids = new Set(['halo/qwen3.8-27b-q4km', 'halo/qwen3.8-27b-q6', 'halo/qwen3.8-27b-q6-fast', 'qwen/qwen3.8-27b']);
export function tunePayload(payload, model) {
  if (!routes.has(model.provider) || !ids.has(model.id) ||
      model.baseUrl?.replace(/\/$/, '') !== 'http://127.0.0.1:1234/v1') return payload;
  // Missing effort means model default, NOT Off.
  const off = payload.reasoning_effort === 'none';
  return { ...payload, temperature: off ? 0.7 : 1, top_p: off ? 0.8 : 0.95,
    top_k: 20, min_p: 0, presence_penalty: off ? 1.5 : 0, repeat_penalty: 1 };
}
export function wrapAdapter(adapter, observe = () => {}) {
  if (typeof adapter.streamWithSnapshot !== 'function') throw new Error('Qwen sampling: incompatible DSH pi-ai adapter; reverify integration');
  const original = adapter.streamWithSnapshot;
  function wrapped(options, snapshot) {
    if (!routes.has(options.provider) || !ids.has(options.model)) return original.call(this, options, snapshot);
    if (typeof snapshot?.models?.streamSimple !== 'function') throw new Error('Qwen sampling: incompatible pi-ai Models API');
    // Per-call facade preserves the captured provider generation and concurrent calls.
    const models = Object.create(snapshot.models);
    models.streamSimple = (model, context, opts = {}) => snapshot.models.streamSimple(model, context, {
      ...opts,
      onPayload: async (payload, wireModel) => {
        const prior = await opts.onPayload?.(payload, wireModel);
        const tuned = tunePayload(prior ?? payload, wireModel);
        if (tuned !== (prior ?? payload)) observe({ model: wireModel.id,
          reasoning_effort: tuned.reasoning_effort, max_tokens: tuned.max_tokens ?? tuned.max_completion_tokens,
          temperature: tuned.temperature, top_p: tuned.top_p, top_k: tuned.top_k,
          min_p: tuned.min_p, presence_penalty: tuned.presence_penalty, repeat_penalty: tuned.repeat_penalty });
        return tuned;
      }
    });
    return original.call(this, options, { ...snapshot, models });
  }
  adapter.streamWithSnapshot = wrapped;
  return () => { if (adapter.streamWithSnapshot === wrapped) adapter.streamWithSnapshot = original; };
}
export function apply(ctx) {
  const installed = new Map();
  function install() {
    for (const provider of routes) {
      if (!ctx.llm.listProviders().some(p => p.id === provider)) continue;
      const adapter = ctx.llm.registration(provider).adapter;
      if (!installed.has(adapter)) installed.set(adapter, wrapAdapter(adapter, fields => {
        ctx.logger.info('qwen27-sampling %s', JSON.stringify(fields));
        // One overwritten, secret-free diagnostic; never store prompts, headers or keys.
        try { writeFileSync(new URL('./last-request.json', import.meta.url), JSON.stringify({time:new Date().toISOString(),...fields}, null, 2)); }
        catch (error) { ctx.logger.warn('qwen27-sampling diagnostic unavailable: %s', error.code); }
      }));
    }
  }
  ctx.on('llm/adapters-updated', install);
  ctx.on('dispose', () => { for (const undo of installed.values()) undo(); });
  install();
}
