// Operator-authorized additive promotion. No process stop/start or model generation.
import fs from 'node:fs';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';import YAML from './tools/node_modules/yaml/dist/index.js';
const prod=path.resolve(import.meta.dirname,'../..'),stack=path.join(prod,'stack'),live=path.join(process.env.USERPROFILE,'.dsh'),dev='C:/Users/scott/Desktop/Code/dsh-halo-dev';
const backup=path.join(live,'backups/native-provider-promotion-20260902');
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const response=await fetch('http://127.0.0.1:3080/api/session.list',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:randomUUID(),method:'session.list',payload:{}})});
const baseline=(await response.json()).result;
if(!baseline?.ok||baseline.value.items.some(s=>s.running))throw Error('Production session activity is unknown or active. Do not promote.');
fs.writeFileSync(path.join(backup,'session-baseline.json'),JSON.stringify(baseline.value.items.map(s=>({sessionId:s.sessionId,updatedAt:s.updatedAt,running:s.running})),null,2));
for(const row of JSON.parse(fs.readFileSync(path.join(backup,'rollback-manifest.json'),'utf8')))if(row.target.replaceAll('\\','/').startsWith(live.replaceAll('\\','/')+'/')&&hash(row.target)!==row.sha256)throw Error('Production changed after snapshot: '+row.target);
for(const f of ['halo-settings.yaml','web-cockpit.patch.yml','web-profile.package.json']){const b=path.join(backup,'stack',f);if(!fs.existsSync(b))fs.copyFileSync(path.join(stack,f),b);}
for(const f of ['cli-provider.mjs','cli-runtime.mjs','cli-metrics.mjs','native-continuity.mjs','cli-provider.test.mjs','cli-runtime.test.mjs','cli-metrics.test.mjs','native-continuity.test.mjs'])fs.copyFileSync(path.join(dev,'dev',f),path.join(import.meta.dirname,f));
const settingsFile=path.join(live,'settings.yaml'),settings=YAML.parseDocument(fs.readFileSync(settingsFile,'utf8'));
const candidate=YAML.parse(fs.readFileSync(path.join(dev,'.runtime/dsh/settings.yaml'),'utf8'))['llm-pi-ai'].providers.omniroute;
const provider={...candidate,displayName:'OmniRoute — cloud/API catalog (connect account where indicated)',baseURL:'http://127.0.0.1:20130/v1',apiKeyEnv:'HALO_PROVIDER_KEY',models:candidate.models.filter(m=>!String(m.id).startsWith('halo-local/')).map(m=>({...m,name:m.name?.replaceAll('; configured;','; connect account;')}))};
settings.setIn(['llm-pi-ai','providers','omniroute'],provider);
fs.writeFileSync(settingsFile,String(settings));fs.copyFileSync(settingsFile,path.join(stack,'halo-settings.yaml'));
const patchFile=path.join(live,'profiles/web/cordis.patch.yml');let patch=fs.readFileSync(patchFile,'utf8');
if(patch.includes('halo-native-cli-provider'))throw Error('Already promoted; inspect instead of duplicate insertion');
patch+='\n- insert:\n    - id: halo-native-cli-provider\n      name: file:///C:/Users/scott/Desktop/Code/dsh-halo-research/stack/provider-integration/cli-provider.mjs\n      config:\n        dataRoot: C:/Users/scott/.dsh/native-cli\n';
fs.writeFileSync(patchFile,patch);fs.copyFileSync(patchFile,path.join(stack,'web-cockpit.patch.yml'));
const manifestFile=path.join(live,'profiles/web/package.json'),manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
for(const [name,file] of Object.entries({'@deepseek-ai/dsh-client-ui-model-selection':'deepseek-ai-dsh-client-ui-model-selection-0.1.1-rc.2-halo-dev-search.4.tgz','@deepseek-ai/dsh-client-ui-conversation':'deepseek-ai-dsh-client-ui-conversation-0.1.1-rc.2-halo-native-metrics.2.tgz','@deepseek-ai/dsh-host-apiproxy':'deepseek-ai-dsh-host-apiproxy-0.1.1-rc.2-halo-selection.3.tgz'}))manifest.dependencies[name]='file:'+path.join(stack,'packages',file).replaceAll('\\','/');
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');fs.copyFileSync(manifestFile,path.join(stack,'web-profile.package.json'));
console.log(JSON.stringify({sessionsPreserved:baseline.value.items.length,cloudCatalog:provider.models.length,productionConfigurationStaged:true,processesRestarted:false}));
