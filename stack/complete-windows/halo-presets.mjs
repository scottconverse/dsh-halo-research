import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const model = 'qwen3.8-flash-next-iq3_s';

export function addHaloPresets(rows, root, components, baseTools) {
  const providers = rows.find(row => row.id === 'llm-pi-ai').config.providers;
  const inserted = rows.find(row => row.insert).insert;
  const file = relative => pathToFileURL(join(root, relative)).href;
  for (const [id, port, contextWindow, maxTokens, input] of [
    ['strata-halo-auto', components.ports.strataFull, 131072, 32768, ['text', 'image']],
    ['strata-halo-capped', components.ports.strataCapped, 32768, 8192, ['text']],
    ['strata-5070ti', components.ports.strataWorker, 32768, 8192, ['text']],
  ]) {
    providers[id] = {
      displayName: { 'strata-halo-auto': 'Halo Strata (full memory)', 'strata-halo-capped': 'Halo Strata (32K capped)', 'strata-5070ti': 'Strata 5070 Ti' }[id],
      api: 'openai-completions',
      apiKeyEnv: 'DSH_COMPLETE_STRATA_TOKEN',
      baseURL: 'http://127.0.0.1:' + port + '/v1',
      models: [{
        id: model, name: 'Qwen3.8 Flash-Next IQ3_S', contextWindow, maxTokens, input,
        ...(id === 'strata-halo-auto' ? { reasoningEfforts: { medium: 'medium', xhigh: 'xhigh' } } : {}),
      }],
    };
  }
  function boundedTools() {
    const tools = structuredClone(baseTools);
    const compaction = tools.find(row => row.id === 'compaction').config.find(row => row.id === 'compaction-basic');
    compaction.config = { ...compaction.config, headroomTokens: 2048, maxTokens: 2048, modelPolicies: [] };
    return tools;
  }
  function preset(id, name, description, plugins) {
    inserted.push({
      id: 'halo-preset-' + id, name: '@deepseek-ai/dsh-agent-preset',
      config: { id, name, description, plugins },
    });
  }
  preset('local-lean', 'Halo 5070 Ti worker tools', 'Worker tool set without Browse or its own delegation tool.', boundedTools());
  const delegate = {
    id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent',
    config: {
      provider: 'spawn', toolName: 'delegate_to_5070ti', agentPreset: 'local-lean', maxDepth: 1,
      agentOptions: { provider: 'strata-5070ti', model, maxTokens: 8192 },
    },
  };
  const policy = { id: 'halo-5070-delegation-policy', name: file('stack/strata-paired/delegation-policy.mjs') };
  const browse = {
    id: 'mcp-halo-browse', name: '@deepseek-ai/dsh-mcp-client',
    config: {
      serverName: 'halo_browse', transport: 'stdio', command: join(root, 'tools/node/node.exe'),
      args: [join(root, 'stack/halo-browse/mcp.mjs')], toolCallTimeoutMs: 60000, failOnStartupError: false,
    },
  };
  for (const [id, label] of [['local-5070', 'Halo + 5070 Ti'], ['local-5070-capped', 'Halo + 5070 Ti (32K capped)']]) {
    const lead = [...boundedTools(), policy,
      { id: 'tool-subagent-control', name: '@deepseek-ai/dsh-tool-subagent-control' },
      structuredClone(delegate)];
    preset(id, label, 'Halo Strata lead with an on-demand 5070 Ti worker. Configure the separate Strata assets before sending a request.', lead);
    preset(id + '-browse', label + ' + Browse', 'Same paired Strata route with headless Browse on the lead. Start Browse separately before selecting.', [...structuredClone(lead), structuredClone(browse)]);
  }
  inserted.push(
    { id: 'halo-strata-auto-start', name: file('stack/strata-paired/autostart.mjs') },
    { id: 'halo-browse-lead-route', name: file('stack/halo-browse/lead-route.mjs') },
  );
}
