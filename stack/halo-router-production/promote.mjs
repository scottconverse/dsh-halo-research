// Scoped, on-box promotion. Does not restore sessions, credentials or runtime state.
import {readFile,writeFile,mkdir,copyFile,cp,realpath,symlink,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),stack=path.resolve(root,'..');
const home='C:/Users/scott/.dsh',release=path.join(root,'release-0.3.0');
const backup=path.join(home,'backups/halo-router-2026-09-08');
const manifestPath=path.join(backup,'manifest.json');
const hash=b=>createHash('sha256').update(b).digest('hex');
const maybe=async p=>{try{return await readFile(p)}catch(e){if(e.code==='ENOENT')return null;throw e}};
const slash=p=>p.replaceAll('\\','/');
const ui='@deepseek-ai/dsh-halo-routing-ui';
const mode=process.argv[2]??'check';
if(mode==='apply'){
 if(await maybe(manifestPath))throw Error('Promotion backup exists; inspect rather than overwrite');
 for(const name of ['halo-routing','halo-policy-deterministic','halo-verified-coder-dev'])await cp(path.join(stack,name),path.join(release,name),{recursive:true,errorOnExist:true,force:false});
 const client=path.join(release,'halo-routing/ui/client.js');
 await writeFile(client,(await readFile(client,'utf8')).replaceAll('Halo Router DEV','Halo Router').replaceAll('DEV defaults','production defaults').replaceAll('this DEV profile','this production profile'));
 const homePatch=path.join(home,'cordis.patch.yml'),pkgFile=path.join(home,'profiles/web/package.json');
 const preset=path.join(home,'.agent-presets/halo-orchestrator/agent.cordis.yml');
 const launcher=path.join(stack,'Run-HaloCockpit.ps1');
 const oldPatch=(await maybe(homePatch))?.toString()??'';
 if(oldPatch.includes('id: halo-routing'))throw Error('Router already mounted');
 const composition=`\n- insert:\n    - id: halo-routing\n      name: file:///${slash(release)}/halo-routing/index.mjs\n      config:\n        home: C:/Users/scott/.dsh\n        gateRoot: C:/Users/scott/AppData/Local/HaloGate/runs\n    - id: halo-policy-deterministic\n      name: file:///${slash(release)}/halo-policy-deterministic/index.mjs\n    - id: halo-routing-ui\n      name: '${ui}'\n`;
 const pkg=JSON.parse(await readFile(pkgFile,'utf8'));
 if(pkg.dependencies[ui])throw Error('Unexpected existing router UI dependency');
 pkg.dependencies[ui]='link:'+slash(path.join(release,'halo-routing/ui'));
 const originalPreset=await readFile(preset,'utf8');
 const workerUrl='file:///C:/Users/scott/Desktop/Code/dsh-halo-research/stack/halo-verified-coder/index.mjs?v=10';
 if(!originalPreset.includes(workerUrl))throw Error('Unexpected original worker; stop');
 const newPreset=originalPreset.replace(workerUrl,`file:///${slash(release)}/halo-verified-coder-dev/index.mjs`).replace("        runRoot: 'C:\\Users\\scott\\AppData\\Local\\HaloGate\\runs'","        routing: true\n        runRoot: 'C:\\Users\\scott\\AppData\\Local\\HaloGate\\runs'");
 if(!newPreset.includes('        routing: true'))throw Error('Worker routing marker absent');
 const originalLauncher=await readFile(launcher,'utf8');
 const newLauncher=originalLauncher.replace('Remove-Item Env:DSH_HOME -EA SilentlyContinue',"$env:DSH_HOME = Join-Path $env:USERPROFILE '.dsh'");
 if(newLauncher===originalLauncher)throw Error('Launcher marker changed');
 const files=[[homePatch,oldPatch.trim()==='[]'?composition:oldPatch+composition],[pkgFile,JSON.stringify(pkg,null,2)+'\n'],[preset,newPreset],[launcher,newLauncher]];
 await mkdir(backup,{recursive:true});
 const manifest={at:new Date().toISOString(),release,files:[],uiLink:path.join(home,'profiles/web/node_modules',ui)};
 for(const [target,after] of files){const before=await maybe(target),saved=path.join(backup,`${manifest.files.length}.before`);if(before)await writeFile(saved,before);manifest.files.push({target,beforeHash:before?hash(before):null,backup:before?saved:null,afterHash:hash(after)});}
 await writeFile(manifestPath,JSON.stringify(manifest,null,2));
 for(const [target,after] of files)await writeFile(target,after);
 await mkdir(path.dirname(manifest.uiLink),{recursive:true});
 await symlink(path.join(release,'halo-routing/ui'),manifest.uiLink,'junction');
 const ledger=path.join(home,'storages/halo_routing.json'),controls=path.join(home,'halo-routing/controls.json');
 if(await maybe(ledger)||await maybe(controls))throw Error('Existing routing state must not be overwritten');
 await mkdir(path.dirname(ledger),{recursive:true});await mkdir(path.dirname(controls),{recursive:true});
 await copyFile(path.join(stack,'halo-router-dev/home/storages/halo_routing.json'),ledger);
 await writeFile(controls,JSON.stringify({version:1,defaults:{mode:'automatic',scope:'local-first',planner:null,worker:null},sessions:{}},null,2));
 await writeFile(path.join(home,'halo-routing/import-provenance.json'),JSON.stringify({source:path.join(stack,'halo-router-dev/home/storages/halo_routing.json'),sha256:hash(await readFile(ledger)),at:new Date().toISOString(),note:'Imported tested DEV qualifications and historical records; not new production qualification. No sessions copied.'},null,2));
 console.log(JSON.stringify({applied:true,backup,release,changedFiles:files.map(x=>x[0])}));
}else if(mode==='exclude-dead-gateway'){
 const m=JSON.parse(await readFile(manifestPath,'utf8')),target=path.join(home,'profiles/web/cordis.patch.yml');
 if(m.files.some(f=>f.target===target))throw Error('Already recorded');
 const before=await readFile(target),after=before.toString().replace('    - id: mcp-halo-research','    - id: mcp-halo-research\n      disabled: true');
 if(after===before.toString())throw Error('Gateway marker missing');
 const saved=path.join(backup,`${m.files.length}.before`);await writeFile(saved,before);
 m.files.push({target,backup:saved,beforeHash:hash(before),afterHash:hash(after)});
 await writeFile(manifestPath,JSON.stringify(m,null,2));await writeFile(target,after);
 console.log('Backed up and disabled the absent Gateway startup dependency.');
}else if(mode==='rollback'){
 const m=JSON.parse(await readFile(manifestPath,'utf8'));
 // Validate every file before restoring any; never overwrite later operator edits.
 for(const f of m.files){const current=await maybe(f.target);if(!current||hash(current)!==f.afterHash)throw Error('Later change requires manual merge: '+f.target);}
 for(const f of m.files){
  // The absent Gateway is an independent startup repair, not part of routing.
  // Restoring its required connection would make the old cockpit fail to start.
  if(path.resolve(f.target)===path.resolve(home,'profiles/web/cordis.patch.yml'))continue;
  if(f.backup)await copyFile(f.backup,f.target);else await unlink(f.target);
 }
 // Keep inert release/link/evidence and all sessions; old composition no longer loads it.
 console.log(JSON.stringify({rolledBack:true,retained:'disabled dead Gateway, release, evidence, routing state and sessions'}));
}else if(mode==='check'){
 const m=JSON.parse(await readFile(manifestPath,'utf8'));
 for(const f of m.files)if(hash(await readFile(f.target))!==f.afterHash)throw Error('Changed deployed file: '+f.target);
 for(const f of m.files)if(f.backup&&hash(await readFile(f.backup))!==f.beforeHash)throw Error('Changed rollback backup: '+f.backup);
 if(path.resolve(await realpath(m.uiLink))!==path.resolve(release,'halo-routing/ui'))throw Error('Wrong UI link');
 console.log(JSON.stringify({pass:true,files:m.files.length,release}));
}else throw Error('Expected apply, check or rollback');
