import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
export const MODEL = 'deepseek-v4.1-flash:1017-cloud';
export const policy = Object.freeze({ model: MODEL, provider: 'ollama', reasoningEffort: 'low', contextWindow: 1048576, maxTokens: 65536, thresholdRatio: 0.7 });
export function profile(root, port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be 1..65535');
  const file = relative => pathToFileURL(join(root, ...relative.split('/'))).href;
  const compaction = { id: 'compaction', name: 'cordis:group', group: true, isolate: { compaction: true, toolResultPruner: true }, config: [
    { id: 'compaction-basic', name: file('stack/stock-dsh/compaction-text-only.mjs'), config: { auto: true, thresholdRatio: 0.7, headroomTokens: 8192, retainRatio: 0.55, maxTokens: 8192, modelPolicies: [{ provider: 'ollama', model: MODEL, thresholdRatio: 0.7 }] } },
    { id: 'command-compact', name: '@deepseek-ai/dsh-command-compact' },
    { id: 'tool-result-pruner', name: '@deepseek-ai/dsh-compaction-tool-result-pruner', config: { thresholdChars: 8192, headChars: 4096, tailChars: 1024 } },
  ] };
  return [
    { id: 'agent-default-model', config: { provider: 'ollama', model: MODEL, reasoningEffort: 'low' } },
    { id: 'llm-pi-ai', config: { providers: { ollama: { displayName: 'DeepSeek Cloud', reasoning: 'low', apiKeyEnv: 'DSH_OLLAMA_LOCAL_TOKEN', api: 'openai-completions', baseURL: 'http://127.0.0.1:11434/v1', models: [{ id: MODEL, name: 'DeepSeek V4.1 Flash 1017 (Cloud)', contextWindow: 1048576, maxTokens: 65536, input: ['text','image'], reasoningEfforts: { low: 'low' } }], compat: { thinkingFormat: 'openai', supportsReasoningEffort: true } } } } },
    { id: 'session-title-llm', disabled: true },
    { id: 'llm-deepseek', disabled: true },
    { id: 'llm-deepseek-account', disabled: true },
    { id: 'agent-preset-registry', config: { default: 'cloud-coding' } },
    ...['preset-standard','preset-ptc','preset-minimal','preset-cordis'].map(id => ({ id, disabled: true })),
    { id: 'webserver', config: { host: '127.0.0.1', port } },
    { id: 'web-runtime', config: { openBrowser: false, printUrl: true, surfaceContext: true } },
    { insert: [
      { id: 'portable-three-role', name: file('stack/three-role/index.mjs'), config: { stateFile: join(root, 'home', 'storages', 'three-role', 'projects.json') } },
      { id: 'portable-cloud-preset', name: '@deepseek-ai/dsh-agent-preset', config: { id: 'cloud-coding', order: 0, name: 'DeepSeek Cloud coding', description: 'Cloud-only coding; triad presets are available separately. Start a triad only when explicitly requested.', plugins: [
        { id: 'persona', name: '@deepseek-ai/dsh-persona', config: { prefix: 'Complete only the user-authorized scope. Preserve existing work and evidence. Do not delegate or publish without authorization.' } },
        { id: 'native-tools', name: '@deepseek-ai/dsh-agent-tool-presentation', config: { mode: 'native' } },
        { id: 'instructions', name: '@deepseek-ai/dsh-agent-instructions', config: { maxBytes: 65536 } },
        { id: 'fs', name: '@deepseek-ai/dsh-tool-fs' },
        { id: 'search', name: '@deepseek-ai/dsh-tool-fs-search', config: { sampleOverCapGlobResults: false } },
        { id: 'shell', name: process.platform === 'win32' ? '@deepseek-ai/dsh-tool-pwsh' : '@deepseek-ai/dsh-tool-bash' },
        { id: 'jobs', name: '@deepseek-ai/dsh-tool-jobs' },
        compaction,
      ] } },
      { id: 'portable-native-goal', name: '@deepseek-ai/dsh-command-goal' },
      { id: 'portable-goal-tool', name: '@deepseek-ai/dsh-tool-goal' },
    ] },
  ];
}
