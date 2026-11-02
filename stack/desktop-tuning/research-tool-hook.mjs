// Desktop retrieval uses the shared bounded Wigolo and Reddit adapters.
// Extend the owning output contract; never disable tool validation.
import {createResearchHook,createRedditAdapter} from '../stock-dsh/fast-first-preset/research-fallback.mjs';
export const name='halo-desktop-research';
export const inject=['systemPrompt','tools'];
export function extendEvidenceSchema(tool){
  const schema=tool?.output?.schema;
  if(tool?.name!=='web_fetch'||schema?.type!=='object'||schema.additionalProperties!==false||
     schema.properties?.url?.type!=='string'||schema.properties?.truncated?.type!=='boolean')
    throw Error('Unrecognized Desktop web_fetch output contract');
  for(const key of ['evidenceFile','coverage']){
    const current=schema.properties[key];
    if(current&&current.type!=='string')throw Error('Conflicting web_fetch '+key+' contract');
  }
  tool.output={...tool.output,schema:{...schema,properties:{...schema.properties,
    evidenceFile:{type:'string'},coverage:{type:'string'}}}};
}
export function apply(ctx){
  const reddit=createRedditAdapter();
  const research=createResearchHook({redditSearch:reddit.search,redditFetch:reddit.fetch});
  ctx.on('tools/execute',async(exec,next)=>{
    if(exec.name==='web_fetch')extendEvidenceSchema(ctx.tools.get(exec.name,exec.agent));
    return research(exec,next);
  });
}
