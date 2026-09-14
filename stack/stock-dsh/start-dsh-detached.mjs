import {spawn} from 'node:child_process';
import {openSync,closeSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const out=openSync(join(root,'logs/dsh.stdout.log'),'w'),err=openSync(join(root,'logs/dsh.stderr.log'),'w');
try{
 const child=spawn(process.execPath,[join(root,'node_modules/@deepseek-ai/dsh/lib/bin.js'),'web','--no-open'],{cwd:'C:/Users/scott/Desktop/Code',detached:true,windowsHide:true,stdio:['ignore',out,err],env:{...process.env,DSH_HOME:'C:/Users/scott/.dsh-stock'}});
 await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
 child.unref();console.log(JSON.stringify({pid:child.pid}));
}finally{closeSync(out);closeSync(err);}
