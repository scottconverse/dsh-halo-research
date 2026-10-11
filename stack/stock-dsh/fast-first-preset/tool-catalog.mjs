// Preset-local retrieval adapter using DSH's stock execution hook.
// Tool visibility remains owned by stock assembly and permission policies.
import { createResearchHook, createRedditAdapter } from './research-fallback.mjs';

export const name = 'halo-lean-tool-catalog';
export const inject = ['systemPrompt'];

export function apply(ctx) {
  console.info('[halo-research] automatic Wigolo and Reddit RSS/Redlib adapter active');
  // Stock tools retain their argument validation and execution policies. The
  // around-dispatch hook returns a value through the stock output contract.
  const reddit = createRedditAdapter();
  ctx.on('tools/execute', createResearchHook({ redditSearch: reddit.search, redditFetch: reddit.fetch }));
  // Keep stock prompt assembly intact: installed browser/memory integrations
  // must be visible to the model, not silently removed from its tool schemas.
}
