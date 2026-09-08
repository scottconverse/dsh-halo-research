import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const home='C:/Users/scott/.dsh',root=new URL('./',import.meta.url);
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const [p,h] of [['settings.yaml','788778116EF982AB7D85976896AB5ED96C7FF45168355108A19DC3F6E566463D'],['.agent-presets/halo-orchestrator/agent.cordis.yml','C88E3F61033D67F5059C23CDFCB8484078CD6CA4AA62D8E841071E995F7DD54E']])assert.equal(hash(await readFile(home+'/'+p)),h.toLowerCase());
const oldControls=JSON.parse(await readFile(new URL('installed-configuration/halo-routing/controls.json',root)));
const controls=JSON.parse(await readFile(home+'/halo-routing/controls.json'));
assert.deepEqual(controls.defaults,oldControls.defaults);
for(const [id,value]of Object.entries(oldControls.sessions))assert.deepEqual(controls.sessions[id],value);
const receipt=JSON.parse(await readFile(new URL('gateway-evidence/dsh-live.json',root)));
const calls=receipt.transcripts.flatMap(t=>t.events).filter(e=>e.type==='tool/call');
const results=receipt.transcripts.flatMap(t=>t.events).filter(e=>e.type==='tool/result');
for(const name of ['web_search','web_fetch']){
 const call=calls.find(e=>e.data.name==='mcp__halo_research__'+name);assert.ok(call);
 const result=results.find(e=>e.data.message.source.callId===call.data.callId);assert.ok(result);
 const block=result.data.message.content.find(b=>b.type==='tool-result');assert.equal(block.isError,false);
 assert.equal(JSON.parse(block.content.find(b=>b.type==='text').text).ok,true);
}
const manifest=home+'/backups/halo-router-2026-09-08/manifest.json';
const before=await readFile(manifest),m=JSON.parse(before);
await writeFile(home+'/backups/gateway-reconnect-2026-09-08/router-manifest.before.json',before,{flag:'wx'});
const f=m.files.find(f=>f.target.replaceAll('\\','/').endsWith('/profiles/web/cordis.patch.yml'));assert.ok(f);
f.afterHash=hash(await readFile(f.target));f.amendment='2026-09-08: Scott requested Gateway reconnection; enabled, startup nonfatal.';
await writeFile(manifest,JSON.stringify(m,null,2));
await writeFile(new URL('gateway-evidence/verification.json',root),JSON.stringify({pass:true,at:new Date().toISOString(),modelConfigUnchanged:true,verifiedCoderUnchanged:true,routerDefaultsUnchanged:true,existingSessionControlsUnchanged:true,successfulTools:['web_search','web_fetch']},null,2));
await copyFile(home+'/profiles/web/cordis.patch.yml',new URL('installed-configuration/profiles/web/cordis.patch.yml',root));
console.log('Gateway calls and preserved DSH configuration verified.');
