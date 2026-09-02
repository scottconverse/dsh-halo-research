// Read-only installed-code inspection. Never executes Bionic's app or reads user credentials.
const fs=require('node:fs');
const vm=require('node:vm');
const s=fs.readFileSync('C:/Program Files/Bionic/resources/app/.webpack-bionic/main/index.js','utf8');
const start=s.indexOf('function a0_0x3b57');
const end=s.indexOf(',((()=>{');
if(start<0||end<0||end>2000)throw Error('Unrecognized bundle wrapper');
const ctx=vm.createContext({});
// Only the literal string table and its arithmetic rotation/lookup helpers.
vm.runInContext(s.slice(start)+'\n'+s.slice(0,end)+');',ctx,{timeout:3000});
const terms=process.argv.slice(2);
const values=vm.runInContext('a0_0x3b57()',ctx,{timeout:100});
const code=s.slice(0,start);
const aliases=new Set(['a0_0x31eb']);
const bindings=[...code.matchAll(/(?:const|let|var)\s+(_0x[0-9a-f]+)=(a0_0x31eb|_0x[0-9a-f]+)(?=[,;])/g)];
let changed=true;while(changed){changed=false;for(const [,left,right] of bindings)if(aliases.has(right)&&!aliases.has(left)){aliases.add(left);changed=true;}}
const decode=snippet=>snippet.replace(/(_0x[0-9a-f]+)\((0x[0-9a-f]+)\)/g,(full,fn,n)=>{
  if(!aliases.has(fn))return full;
  const text=values[parseInt(n)-0x14a];return text===undefined?full:JSON.stringify(text);
});
for(const term of terms){
  const index=values.indexOf(term);
  console.log('\nTERM '+term+' INDEX '+index);
  if(index<0)continue;
  const hex='0x'+(index+0x14a).toString(16);
  const regex=new RegExp('_0x[0-9a-f]+\\('+hex+'\\)','g');
  let m,count=0;
  while((m=regex.exec(code))&&count++<5){
    console.log(decode(code.slice(Math.max(0,m.index-350),m.index+1300)));
  }
}
