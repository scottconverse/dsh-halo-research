import {createHash} from 'node:crypto';
export const stableId=(...parts)=>createHash('sha256').update(JSON.stringify(parts)).digest('hex');
const labels=['role','requiredTier','requiredContextWindow','requiredCapabilities','taskKind','riskClass','contextClass','localOnly'];
export function workloadLabels(input={}){return Object.fromEntries(labels.filter(k=>input[k]!==undefined).map(k=>[k,structuredClone(input[k])]));}
/** Independent policy registry. Never performs an actual model selection. */
export function createRouting({ledger,candidates=()=>[],qualifications=()=>[],emit=()=>{},validateOutcome=async()=>false,policyTimeoutMs=150}){
 const policies=new Map();const stats={policyErrors:0,observerErrors:0};
 async function safeAppend(id,row){try{return await ledger.append(id,row);}catch{stats.observerErrors++;return false;}}
 const api={
  registerPolicy(policy){
   if(!policy?.id||typeof policy.recommend!=='function')throw Error('Policy id and recommend required');
   if(policies.has(policy.id))throw Error('Duplicate policy id');
   policies.set(policy.id,policy);emit('halo-routing/policy-added',{id:policy.id,version:policy.version});
   return ()=>{if(policies.get(policy.id)===policy){policies.delete(policy.id);emit('halo-routing/policy-removed',{id:policy.id});}};
  },
  listPolicies(){return [...policies.values()].map(p=>({id:p.id,version:p.version,authority:'none'}));},
  async observe(row){
   const clean={kind:'observation',observationId:row.observationId,sessionId:row.sessionId,turnId:row.turnId,step:row.step,attempt:row.attempt??0,parentSessionId:row.parentSessionId??null,timestamp:row.timestamp,selectionSource:row.selectionSource??'unknown',requested:row.requested??null,actual:row.actual,executionProfile:row.executionProfile,profileObservation:row.profileObservation??{phase:'unspecified'},workload:workloadLabels(row.workload),measurement:row.measurement??null};
   const result=await safeAppend(row.observationId,clean);if(result)emit('halo-routing/observation',clean);return result;
  },
  async recommend(workload){
   const policy=policies.values().next().value;if(!policy)return null;
   let timer;
   try{
const result=await Promise.race([Promise.resolve().then(()=>policy.recommend({workload:workloadLabels(workload),candidates:structuredClone(candidates(workload).filter(c=>!workload.localOnly||c.locality==='local')),qualifications:structuredClone(qualifications()),policy:policy.config??{}})),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Policy timeout')),policyTimeoutMs);})]);
    return result?{...result,policyId:policy.id,policyVersion:policy.version,policyConfigDigest:stableId(policy.config??{}),authority:'none'}:null;
   }catch{stats.policyErrors++;return null;}finally{clearTimeout(timer);}
  },
  async recordOutcome(outcome){
   const observed=ledger.get(outcome.observationId);
   if(!observed||observed.kind!=='observation')return false;
   const measurement=ledger.get(stableId('measurement',outcome.observationId));
   const profile=measurement?.executionProfileObservation;
   if(profile?.phase!=='post-terminal'||!profile.fingerprint)return false;
   const expected=profile.fingerprint;
   if(outcome.executionFingerprint!==expected)return false;
   if(!['pass','fail'].includes(outcome.result))return false;
   try{if(!await validateOutcome(outcome))return false;}catch{stats.observerErrors++;return false;}
   // Task outcomes never automatically grant role qualification.
   return safeAppend(stableId('outcome',outcome.observationId,outcome.receiptId),{kind:'outcome',observationId:outcome.observationId,receiptId:outcome.receiptId,executionFingerprint:outcome.executionFingerprint,profileEvidencePhase:profile?.phase??'dispatch-snapshot',role:outcome.role,verifierVersion:outcome.verifierVersion,result:outcome.result,timestamp:outcome.timestamp,qualificationState:'unknown'});
  },
 };
 return {api,stats,
  async recordMeasurement(observationId,measurement){if(!ledger.get(observationId))return false;return safeAppend(stableId('measurement',observationId),{...measurement,kind:'measurement',observationId});},
  async recordRecommendation(observationId,recommendation){
   if(!recommendation)return false;
   // Identical candidate evaluations are stored once, not copied thousands of times per turn.
   const evaluationId=stableId('evaluation',recommendation);
   if(!ledger.get(evaluationId)&&!await safeAppend(evaluationId,{...recommendation,authority:'none',kind:'evaluation',evaluationId}))return false;
   const id=stableId('recommendation',observationId,recommendation.policyId,recommendation.policyVersion,recommendation.policyConfigDigest);
   const row={kind:'recommendation',observationId,recommendationId:id,evaluationId,timestamp:new Date().toISOString(),authority:'none',policyId:recommendation.policyId,policyVersion:recommendation.policyVersion,policyConfigDigest:recommendation.policyConfigDigest,recommendedCandidateId:recommendation.recommendedCandidateId??null,explanation:recommendation.explanation??null};
   const wrote=await safeAppend(id,row);if(wrote)emit('halo-routing/recommendation',row);return wrote;
  }
 };
}
