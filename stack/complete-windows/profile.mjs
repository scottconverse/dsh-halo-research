import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { profile as cloudProfile, MODEL } from '../portable-cloud/profile.mjs';
export function profile(root, components, host = 'web') {
  if (!['web', 'desktop'].includes(host)) throw Error('Unknown DSH host');
  const rows = cloudProfile(root, components.ports.web);
  const ollama = rows.find(row => row.id === 'llm-pi-ai').config.providers.ollama;
  ollama.displayName = 'Ollama local + DeepSeek cloud';
  ollama.baseURL = `http://127.0.0.1:${components.ports.ollama}/v1`;
  // Only the exact existing DeepSeek model inherits Low and its cloud context.
  ollama.models.push(...components.models.map(({ id, name, contextWindow, maxTokens, input }) => ({ id, name, contextWindow, maxTokens, input })));
  delete ollama.reasoning;
  const inserted = rows.find(row => row.insert).insert;
  const preset = inserted.find(row => row.id === 'portable-cloud-preset');
  preset.config.description = 'DeepSeek cloud coding through the private Ollama gateway. Local Qwen presets are separate. No automatic delegation.';
  const file = relative => pathToFileURL(join(root, relative)).href;
  inserted.push(
    { id: 'complete-research', name: file('stack/desktop-tuning/research-tool-hook.mjs') },
    { id: 'complete-codex', name: '@deepseek-ai/dsh-subagent-codex', config: { env: { CODEX_HOME: join(root, 'data/codex') } } },
    { id: 'complete-claude-code', name: '@deepseek-ai/dsh-subagent-claude-code', config: { env: { CLAUDE_CONFIG_DIR: join(root, 'data/claude') } } },
    { id: 'complete-xerj', name: '@deepseek-ai/dsh-mcp-client', config: { serverName: 'xerj', transport: 'stdio', command: join(root, 'tools/node/node.exe'), args: [join(root, 'xerj-mcp.mjs')], toolCallTimeoutMs: 60000, failOnStartupError: false } },
    { id: 'complete-wigolo', name: '@deepseek-ai/dsh-mcp-client', config: { serverName: 'wigolo', transport: 'stdio', command: join(root, 'tools/node/node.exe'), args: [join(root, 'node_modules/wigolo/dist/index.js')], toolCallTimeoutMs: 60000, failOnStartupError: false } },
  );
  const tools = preset.config.plugins;
  for (const model of components.models) {
    const plugins = structuredClone(tools);
    const compaction = plugins.find(row => row.id === 'compaction').config.find(row => row.id === 'compaction-basic');
    // Bounded local context; do not copy the cloud's 1M-token allocation.
    compaction.config = { auto: true, thresholdRatio: 0.7, headroomTokens: 2048, retainRatio: 0.55, maxTokens: 2048 };
    inserted.push({ id: `local-${model.id}`, name: '@deepseek-ai/dsh-agent-preset', config: { id: model.id.replace(/[^a-z0-9]/gi, '-'), name: `${model.name} (local tools)`, description: `Select ${model.id} in the native model selector. Presets own tools, not the host model route.`, plugins } });
  }
  for (const [provider, label] of [['codex', 'Codex'], ['claude-code', 'Claude Code']]) {
    inserted.push({ id: `connected-${provider}`, name: '@deepseek-ai/dsh-agent-preset', config: { id: `connected-${provider}`, name: `DeepSeek + signed-in ${label}`, description: `Use the ${label} delegation tool only when requested. Sign in separately; no account credentials are bundled.`, plugins: [...structuredClone(tools), { id: `tool-${provider}`, name: '@deepseek-ai/dsh-tool-subagent', config: { provider, toolName: `subagent_${provider.replaceAll('-', '_')}`, backgroundMode: 'one-shot', maxDepth: 'provider-managed' } }] } });
  }
  if (host === 'desktop') inserted.push({id: 'desktop-mission-control',
    name: file('stack/desktop-mission-control/index.mjs'), config: {
      port: components.ports.desktopMissionControl, deploymentRoot: root,
      repositoryProfile: join(root, 'desktop-profile/cordis.patch.yml'),
      ollamaOnly: true, ollamaOrigin: `http://127.0.0.1:${components.ports.ollama}`,
      version: components.dsh,
    }});
  // Desktop's official host assigns an ephemeral authenticated listener.
  // A literal webserver port would override that and collide with Web.
  return host === 'desktop' ? rows.filter(row => !['webserver', 'web-runtime'].includes(row.id)) : rows;
}
export { MODEL };
