import {deriveProfile,fingerprintProfile} from './profile.mjs';
/** DSH-to-donor identity translation, not selection logic. */
export function executionCandidates(candidates,rows,runtime,projection={}){
 const hasCurrentTools=Object.prototype.hasOwnProperty.call(projection,'tools');
 const latest=new Map();
 for(const row of rows){const profile=row.executionProfileObservation?.profile;
  if(row.kind==='measurement'&&row.executionProfileObservation?.phase==='post-terminal'&&profile){
   const key=profile.identity.provider+'/'+profile.identity.model;
   if((latest.get(key)?.sequence??-1)<(row.sequence??0))latest.set(key,{sequence:row.sequence??0,profile});
  }
 }
 return candidates.map(candidate=>{
  const previous=latest.get(candidate.candidateId)?.profile;if(!previous)return {...candidate};
  const profile=deriveProfile({...candidate,reasoningMode:previous.reasoningMode.state==='observed'?previous.reasoningMode.value:undefined,...hasCurrentTools?{tools:projection.tools}:{}},candidate.provider==='lmstudio'?(runtime.get(candidate.model)??{}):{});
  // Status and advisory callers reuse the observed digest. Active callers can
  // supply their current tools so qualification is checked against this request.
  if(!hasCurrentTools)profile.toolSchemaDigest=previous.toolSchemaDigest;
  profile.fingerprint=fingerprintProfile(profile);
  return {...candidate,executionFingerprint:profile.fingerprint,executionProfile:profile,runtimeVersion:'DSH/0.1.1-rc.2',fingerprintSource:'observed-tools-and-current-runtime'};
 });
}
