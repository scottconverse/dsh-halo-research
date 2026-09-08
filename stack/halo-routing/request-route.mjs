export function originalRoute(resolved, selected={}) {
 const provider=selected.provider??resolved.provider,model=selected.model??resolved.model;
 const effort=selected.reasoningEffort??(provider===resolved.provider&&model===resolved.model?resolved.reasoningEffort:undefined);
 return {provider,model,...effort===undefined?{}:{reasoningEffort:effort}};
}
export function applyRoute(resolved, route) {
 const {reasoningEffort:discarded,...rest}=resolved;
 return {...rest,provider:route.provider,model:route.model,...route.reasoningEffort===undefined?{}:{reasoningEffort:route.reasoningEffort}};
}

export function requestRequirements(session, meter, maxTokens) {
 const capabilities=new Set(['text']);let known=true;
 // Same replay/compaction projection consumed by DSH's buildRequest.
 try {
  const messages=session.deriveMessages();
  if(!Array.isArray(messages))throw Error('No message projection');
  const visit=blocks=>{
   if(!Array.isArray(blocks)){known=false;return;}
   for(const block of blocks){
    if(block?.type==='image')capabilities.add('image');
    else if(block?.type==='tool-result')visit(block.content);
    else if(!['text','reasoning','tool-call'].includes(block?.type))known=false;
   }
  };
  for(const message of messages)visit(message.content);
 }catch{known=false;}
 const result={requiredCapabilities:[...capabilities],requirementsKnown:known};
 // Reuse DSH's estimate; do not invent another tokenizer or infer capacity
 // from the previous model's window. Compaction remains DSH-owned.
 try {
  const total=meter?.measure(session)?.totalTokens;
  const reserve=Number.isSafeInteger(maxTokens)&&maxTokens>0?maxTokens:0;
  if(Number.isFinite(total)&&total>0&&Number.isSafeInteger(Math.ceil(total)+reserve))result.requiredContextWindow=Math.ceil(total)+reserve;
 }catch{}
 return result;
}
