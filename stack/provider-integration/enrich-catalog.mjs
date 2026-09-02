// Pure catalog merge. Discovery metadata is not authentication or inference proof.
export const NON_CHAT_SURFACE_TYPES = Object.freeze([
  'audio','video','image','moderation','rerank','embedding','music',
]);
const nonChat = new Set(NON_CHAT_SURFACE_TYPES);
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const positiveInteger = value => Number.isSafeInteger(value) && value > 0 ? value : undefined;

export function enrichCatalog(legacyRows, richRows, {engineContexts = {}, providerAliases = {}} = {}) {
  const canonical = provider => text(providerAliases[provider]) || provider;
  const key = (provider,model) => `${canonical(provider)}/${model}`;
  const richById = new Map();
  for(const item of richRows){
    const qualified = text(item?.id);
    const slash = qualified?.indexOf('/') ?? -1;
    const provider = slash > 0 ? qualified.slice(0,slash) : text(item?.owned_by);
    const model = slash > 0 ? qualified.slice(slash+1) : text(item?.root) || qualified;
    if(provider && model) richById.set(key(provider,model),{...item,provider:canonical(provider),model});
  }
  const candidates = new Map();
  for(const item of legacyRows){
    const provider = text(item?.provider), model = text(item?.model);
    if(provider && model && !candidates.has(key(provider,model))) candidates.set(key(provider,model),item);
  }
  for(const [id,item] of richById) if(!candidates.has(id)) candidates.set(id,null);

  const rows = [], excluded = [];
  for(const [id,legacy] of candidates){
    const rich = richById.get(id);
    const provider = legacy?.provider || rich.provider;
    const model = legacy?.model || rich.model;
    const name = text(legacy?.name) || text(rich?.name) || model;
    const type = text(rich?.type) || text(legacy?.type);
    const classificationSource = text(rich?.type) ? 'rich-catalog' : text(legacy?.type) ? 'legacy-catalog' : 'unknown';
    if(nonChat.has(type)){
      excluded.push({id:`${provider}/${model}`,provider,model,name,type,reason:'explicit-non-chat-type',classificationSource});
      continue;
    }
    const engineContext = positiveInteger(engineContexts[`${provider}/${model}`]) ?? positiveInteger(engineContexts[id]);
    const declaredContext = positiveInteger(rich?.context_length) ?? positiveInteger(legacy?.contextWindow);
    const contextWindow = engineContext ?? declaredContext;
    const row = {
      ...legacy,provider,model,name,
      contextSource: engineContext ? 'engine-observed' : declaredContext ? 'catalog-declared-unverified' : 'unknown',
      contextVerified: engineContext !== undefined,
      classificationSource,
      sourceFlags: {legacyCatalog:legacy !== null,richCatalog:rich !== undefined,engineContext:engineContext !== undefined,classificationExplicit:type !== null},
    };
    if(type) row.type = type;
    for(const field of ['input_modalities','output_modalities','supported_endpoints']){
      if(Array.isArray(rich?.[field])) row[field] = [...rich[field]];
    }
    if(rich?.capabilities && typeof rich.capabilities === 'object') row.capabilities = structuredClone(rich.capabilities);
    if(contextWindow !== undefined) row.contextWindow = contextWindow;
    else delete row.contextWindow;
    rows.push(row);
  }
  return {rows,excluded};
}
