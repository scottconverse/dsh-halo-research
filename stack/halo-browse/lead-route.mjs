export const name = 'halo-browse-lead-route';
export const inject = ['agents', 'agentPresets'];

const routes = new Map([
  ['local-5070-browse', 'strata-halo-auto'],
  ['local-5070-capped-browse', 'strata-halo-capped'],
]);
const paired = new Set(['local-5070', 'local-5070-capped']);

export function apply(ctx) {
  const selected = new WeakMap();
  function sync(agent, preset) {
    const { lastTurn, openTurnStartSeq } = ctx.agents.turnBoundaryOf(agent.session);
    if (lastTurn || openTurnStartSeq !== null) return;
    if ((agent.session.header.delegationDepth ?? 0) || (agent.options.subagentDepth ?? 0)) return;
    const route = routes.get(preset);
    const previous = selected.get(agent);
    if (route) {
      selected.set(agent, { original: previous?.original ?? agent.model.current(), route });
      agent.model.select({ provider: route, model: 'qwen3.8-flash-next-iq3_s' });
    } else if (previous) {
      if (!paired.has(preset) && previous.original && agent.model.current()?.provider === previous.route) {
        agent.model.select(previous.original);
      }
      selected.delete(agent);
    }
  }
  ctx.on('agent/created', ({ agent }) => {
    if (agent.model.recordedSelection() == null) sync(agent, ctx.agentPresets.presetForSession(agent.session));
  });
  ctx.on('agent-preset/selected', (id, preset) => queueMicrotask(() => {
    const agent = ctx.agents.get(id);
    if (agent && ctx.agentPresets.presetForSession(agent.session) === preset) sync(agent, preset);
  }));
}
