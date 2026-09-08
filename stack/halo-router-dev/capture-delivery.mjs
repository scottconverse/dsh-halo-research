// Generate bounded release evidence and Scott's read/recovery copies.
import {readFile,writeFile,readdir,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dev=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dev,'../..');
const research='C:/Users/scott/Desktop/Halo Stack Research';
const recovery=path.join(research,'Current Halo Configuration');
const bundle=path.join(recovery,'halo-router-dev-0.3.0');
async function files(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){if(['node_modules','home','.git','runtime','workspaces','private'].includes(entry.name))continue;const p=path.join(dir,entry.name);if(entry.isDirectory())result.push(...await files(p));else if(!entry.name.endsWith('.log'))result.push(p);}return result;}
const evidence=path.join(dev,'evidence');
const tests=execFileSync(process.execPath,['--test','test/*.test.mjs','stack/halo-routing/test/*.test.mjs','stack/halo-policy-deterministic/test/*.test.mjs','stack/halo-policy-deterministic/vendor/devharmonics/test/fleet.test.mjs','stack/halo-policy-deterministic/vendor/codex-factory/test/factory-fleet.test.mjs'],{cwd:repo,encoding:'utf8'});
await writeFile(path.join(evidence,'focused-tests.txt'),tests);
await writeFile(path.join(evidence,'gate-integration-tests.txt'),execFileSync(process.execPath,['--test','stack/halo-verified-coder-dev/test/*.test.mjs','stack/halo-verified-coder/test/*.test.mjs'],{cwd:repo,encoding:'utf8'}));
await writeFile(path.join(evidence,'acceptance-protocol-tests.txt'),execFileSync(process.execPath,['acceptance-client.mjs','--self-test'],{cwd:dev,encoding:'utf8'}));
const verification=JSON.parse(execFileSync(process.execPath,['prepare.mjs','--verify'],{cwd:dev,encoding:'utf8'}));
if(verification.changed.length)throw Error('Production differs; stop delivery');
await writeFile(path.join(evidence,'production-final.json'),JSON.stringify({at:new Date().toISOString(),...verification},null,2)+'\n');
for(const name of ['candidate-reconciliation.json','status.json'])await copyFile(path.join(dev,'home/halo-routing',name),path.join(evidence,name==='candidate-reconciliation.json'?name:name.replace('.json','-snapshot.json')));
// Preserve every record without committing a million lines of repeated catalogs.
const rawRecords=await readFile(path.join(dev,'home/halo-routing/records.json'));
await writeFile(path.join(evidence,'records-snapshot.json.gz'),gzipSync(rawRecords));
await writeFile(path.join(evidence,'records-snapshot.json'),JSON.stringify({format:'gzip-json',file:'records-snapshot.json.gz',uncompressedBytes:rawRecords.length,sha256:createHash('sha256').update(rawRecords).digest('hex'),records:JSON.parse(rawRecords).length},null,2)+'\n');
await mkdir(bundle,{recursive:true});
const selected=[];
for(const directory of ['stack/halo-router-dev','stack/halo-routing','stack/halo-policy-deterministic','stack/halo-verified-coder-dev','test'])selected.push(...await files(path.join(repo,directory)));
for(const name of ['HALO-ROUTER-HUMAN-RELEASE-2026-09-08.md','HALO-CURRENT-CONFIGURATION.md','HALO-STACK-GUIDE.md','HALO-DSH-IMPLEMENTATION-2026-09-07.md','HALO-ROUTER-REAUDIT-2026-09-07.md','HALO-ROUTER-DIRECT-REUSE-2026-09-07.md']){
 const source=path.join(repo,'stack',name);selected.push(source);await copyFile(source,path.join(research,name));await copyFile(source,path.join(recovery,name));
}
await copyFile(path.join(dev,'HALOROUTERSPECv0.3.md'),path.join(research,'HALOROUTERSPECv0.3.md'));
await copyFile(path.join(dev,'README.md'),path.join(research,'HALO-ROUTER-DEV-README.md'));
for(const relative of ['home/halo-routing/controls.json','home/settings.yaml','home/cordis.patch.yml','home/profiles/web/cordis.patch.yml','home/profiles/web/package.json','home/profiles/web/pnpm-lock.yaml','home/.agent-presets/halo-orchestrator/agent.cordis.yml','home/.agent-presets/halo-orchestrator/preset.yml'])selected.push(path.join(dev,relative));
const manifest=[];
for(const source of [...new Set(selected)]){
 const relative=path.relative(repo,source),destination=path.join(bundle,relative);await mkdir(path.dirname(destination),{recursive:true});await copyFile(source,destination);
 const digest=createHash('sha256').update(await readFile(source)).digest('hex');
 if(createHash('sha256').update(await readFile(destination)).digest('hex')!==digest)throw Error('Copy mismatch');
 manifest.push(`${digest}  ${relative}`);
}
await writeFile(path.join(bundle,'MANIFEST-SHA256.txt'),'# Halo Router DEV 0.3.0 recovery copy; not a production promotion\n'+manifest.sort().join('\n')+'\n');
// Preserve unrelated snapshot entries; refresh only exact copied documents and this new bundle.
const parentManifest=path.join(recovery,'MANIFEST-SHA256.txt');
const old=(await readFile(parentManifest,'utf8')).split(/\r?\n/).filter(Boolean);
const replacement=new Map();
for(const name of ['HALO-ROUTER-HUMAN-RELEASE-2026-09-08.md','HALO-CURRENT-CONFIGURATION.md','HALO-STACK-GUIDE.md','HALO-DSH-IMPLEMENTATION-2026-09-07.md','HALO-ROUTER-REAUDIT-2026-09-07.md','HALO-ROUTER-DIRECT-REUSE-2026-09-07.md'])replacement.set(name,createHash('sha256').update(await readFile(path.join(recovery,name))).digest('hex'));
for(const source of await files(bundle)){const relative=path.relative(recovery,source);replacement.set(relative,createHash('sha256').update(await readFile(source)).digest('hex'));}
const kept=old.filter(line=>{const match=/^[a-fA-F0-9]{64}\s+(.+)$/.exec(line);return !match||!replacement.has(match[1]);});
await writeFile(parentManifest,kept.join('\n')+'\n# DEV-only addition '+new Date().toISOString()+'\n'+[...replacement].map(([p,hash])=>`${hash}  ${p}`).join('\n')+'\n');
console.log(JSON.stringify({bundle,copiedFiles:manifest.length,verifiedCopies:manifest.length,production:verification,testOutput:'evidence/focused-tests.txt'}));
