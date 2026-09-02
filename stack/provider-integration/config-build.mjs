export function buildDevSettings(production, gatewayModels = []) {
  const out = structuredClone(production);
  const providers = out['llm-pi-ai'].providers;
  providers.lmstudio.displayName = 'DEV: existing local runtime (shared hardware)';
  providers.omniroute = {
    displayName: 'DEV: OmniRoute cloud and subscription providers',
    api: 'openai-completions', baseURL: 'http://127.0.0.1:20129/v1',
    apiKeyEnv: 'HALO_DEV_GATEWAY_KEY', defaultInput: ['text'],
    defaultContextWindow: 32768, defaultMaxTokens: 8192,
    models: gatewayModels,
  };
  return out;
}
