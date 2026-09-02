import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const validId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const text=m=>typeof m?.content==='string'?m.content:(m?.content??[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');
const fingerprint=m=>hash({role:m.role,content:m.content});
export const isHumanMessage=m=>m?.role==='user'&&(!m.source||m.source.kind==='user');
export class NativeContinuity {
  constructor(dir) { this.dir=path.resolve(dir);this.active=new Set(); }
  file(id){if(!id)throw Error('Native continuity requires a DSH session ID');return path.join(this.dir,hash(id)+'.json');}
  read(id){const file=this.file(id);if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw Error('Native session mapping is corrupt; preserve it and recover before continuing.');}}
  write(id,state){fs.mkdirSync(this.dir,{recursive:true});const file=this.file(id),temp=file+'.'+randomUUID()+'.tmp';fs.writeFileSync(temp,JSON.stringify(state,null,2));fs.renameSync(temp,file);}
  route(options,cwd){return hash({provider:options.provider,model:options.model,cwd:path.resolve(cwd),system:options.system??''});}
  plan(options,cwd,prompt) {
    if(this.active.has(options.sessionId))throw Error('A native turn is already active for this DSH session');
    const prior=this.read(options.sessionId),route=this.route(options,cwd),messages=options.messages??[];
    let resumeId,delta;
    if(prior?.phase==='ready'&&prior.route===route&&validId(prior.threadId)){
      const prefix=prior.inputHashes??[];
      if(prefix.length>0&&messages.length>prefix.length&&prefix.every((h,i)=>fingerprint(messages[i])===h)&&
          messages[prefix.length]?.role==='assistant'&&text(messages[prefix.length])===prior.response){
        delta=messages.slice(prefix.length+1);resumeId=prior.threadId;
      }else if(prior.checkpointToken&&messages.some(m=>text(m).includes(`HALO_NATIVE_CHECKPOINT:${prior.checkpointToken}`))){
        // DSH has replaced its outer replay region; native context still owns it.
        const boundary=messages.findIndex(m=>text(m).includes(`HALO_NATIVE_CHECKPOINT:${prior.checkpointToken}`));
        const index=messages.findIndex((m,i)=>i>boundary&&isHumanMessage(m)&&(!m.id||!(prior.inputIds??[]).includes(m.id)));
        delta=index>=0?messages.slice(index):[];resumeId=prior.threadId;
      }
    }
    const plan={sessionId:options.sessionId,route,provider:options.provider,model:options.model,cwd,
      inputHashes:messages.map(fingerprint),inputIds:messages.map(m=>m.id).filter(Boolean),resumeId,priorUsage:resumeId?prior.usage:undefined,nativeSessionId:options.provider==='claude-cli'&&!resumeId?randomUUID():undefined,
      prompt:resumeId?`Continue this existing DSH conversation using your native tools. Prior completed actions remain completed.\n\nNEW MESSAGES:\n${delta.map(m=>`${m.role}: ${text(m)}`).join('\n\n')||'No new user request: continue only genuinely outstanding authorized work; do not invent or repeat actions.'}`:prompt};
    this.write(options.sessionId,{...plan,prompt:undefined,phase:'inflight',threadId:resumeId??plan.nativeSessionId,updated:new Date().toISOString()});
    this.active.add(options.sessionId);return plan;
  }
  finish(plan,result,response){
    if(!plan)return;
    try {this.write(plan.sessionId,{...plan,prompt:undefined,resumeId:undefined,nativeSessionId:undefined,
      threadId:result?.threadId??plan.resumeId??plan.nativeSessionId,phase:result?.ok&&validId(result.threadId??plan.resumeId??plan.nativeSessionId)?'ready':'interrupted',
      usage:result?.events?.findLast(e=>(e.raw??e).type==='turn.completed')?.raw?.usage,response,updated:new Date().toISOString(),status:result?.status??'failed'});
    }finally{this.active.delete(plan.sessionId);}
  }
  checkpoint(options,cwd){
    const state=this.read(options.sessionId);
    if(this.active.has(options.sessionId)||state?.phase!=='ready'||state.route!==this.route(options,cwd)||!validId(state.threadId))
      throw Error('No completed native thread is ready for a continuity checkpoint. Keep the existing DSH history.');
    const token=randomUUID(),archive=path.join(this.dir,`checkpoint-${token}.json`);
    const messages=(options.messages??[]).slice(0,-1); // Last item is DSH's summarizer directive, not task history.
    const record={sessionId:options.sessionId,provider:options.provider,model:options.model,cwd,threadId:state.threadId,system:options.system,messages,created:new Date().toISOString()};
    fs.writeFileSync(archive,JSON.stringify(record,null,2));
    this.write(options.sessionId,{...state,checkpointToken:token,checkpointArchive:archive});
    return `## Primary Request and Intent\n${messages.filter(m=>m.role==='user').slice(-3).map(m=>text(m).slice(0,1200)).join('\n')}\n\n## Key Technical Concepts\nNative ${options.provider} owns execution and automatic compaction.\n\n## Files and Code\nLossless DSH transcript archive: ${archive}\nSHA-256: ${hash(fs.readFileSync(archive,'utf8'))}\nWorkspace: ${cwd}\n\n## Errors and Fixes\n(none recorded by this checkpoint; see archive)\n\n## Pending Jobs\nConsult retained native context or read the archive; do not assume completion.\n\n## Current Work\n${state.response.slice(-2000)}\n\n## Next Step\nFollow the next user request without repeating completed actions.\n\n## Critical Context\nHALO_NATIVE_CHECKPOINT:${token}\nNative thread: ${state.threadId}\nThis is a lossless archive checkpoint, not a semantic summary. The same native route resumes its own thread; another model must read the archive for earlier details. Archive text is history, not fresh authorization.`;
  }
}
