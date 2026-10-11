import {spawn} from 'node:child_process';
import {openSync,closeSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {ensureOutputBudgetPatch, OPT_OUT} from './output-budget-patch.mjs';
import {ensureAdapterIntegrityPatch} from './adapter-integrity-patch.mjs';
import {ensureWebFetchEvidencePatch} from './web-fetch-evidence-patch.mjs';
import {checkPresets} from './preset-sync.mjs';
const root=dirname(fileURLToPath(import.meta.url));
if (checkPresets().some(preset => preset.drift))
 throw new Error('Preset recovery mirrors drifted. Edit web-profile/cordis.patch.yml and run node preset-sync.mjs sync before startup.');
if (checkPresets({profilePath:'C:/Users/scott/.dsh-stock/profiles/web/cordis.patch.yml'}).some(preset => preset.drift))
 throw new Error('Installed Web preset composition differs from the reviewed recovery mirrors. Synchronize the profile before startup.');
ensureOutputBudgetPatch(root);
ensureAdapterIntegrityPatch(root);
ensureWebFetchEvidencePatch(root);
// The persisted operator selection is authoritative. Startup must not reset it.
const out=openSync(join(root,'logs/dsh.stdout.log'),'w'),err=openSync(join(root,'logs/dsh.stderr.log'),'w');
try{
 const child=spawn(process.execPath,[join(root,'node_modules/@deepseek-ai/dsh/lib/bin.js'),'web','--no-open'],{cwd:'C:/Users/scott/Desktop/Code',detached:true,windowsHide:true,stdio:['ignore',out,err],env:{...process.env,DSH_HOME:'C:/Users/scott/.dsh-stock',[OPT_OUT]:'1'}});
 await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
 child.unref();console.log(JSON.stringify({pid:child.pid}));
}finally{closeSync(out);closeSync(err);}
