export const name = 'halo-5070-delegation-policy';
export const inject = ['systemPrompt', 'tools'];

export function apply(ctx) {
  ctx.systemPrompt.section({
    name,
    order: ctx.systemPrompt.getSectionOrder('TOOL_SUBAGENT') + 1,
    text: ({ scope }) => ctx.tools.get('delegate_to_5070ti', scope)
      ? 'Use delegate_to_5070ti on your own initiative when a substantial, independent task can run in parallel. Give it a stand-alone task and scope, then continue useful lead work and integrate its result. Keep quick and tightly coupled work on the lead. Respect instructions about whether to delegate. If the worker is unavailable, report this and continue on the lead.'
      : '',
  });
}
