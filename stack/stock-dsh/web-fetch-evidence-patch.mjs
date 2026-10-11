import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';

export const PRISTINE_SHA256='A8313D4E02C751F79D0F91DCEB8DFCAA29E7C7A0299AB0D7F8DB65471217B0C8';
const root=dirname(fileURLToPath(import.meta.url));
const anchor='\t\t\t\t\ttruncated: {\n\t\t\t\t\t\ttype: "boolean",\n\t\t\t\t\t\trequired: true\n\t\t\t\t\t}';
const replacement=anchor+',\n\t\t\t\t\t// Halo retrieval provenance: optional typed metadata, not arbitrary extra output.\n\t\t\t\t\tevidenceFile: { type: "string" },\n\t\t\t\t\tcoverage: { type: "string" }';
export function patchWebFetchEvidence(source){
  const start=source.indexOf('function applyWebFetchTool(');
  if(start<0)throw Error('web_fetch registration anchor missing');
  const head=source.slice(0,start),tail=source.slice(start);
  if(tail.includes(replacement))return source;
  if(tail.split(anchor).length!==2)throw Error('Expected one exact web_fetch output schema anchor');
  return head+tail.replace(anchor,replacement);
}
export function ensureWebFetchEvidencePatch(deployment=root){
  const require=createRequire(join(deployment,'package.json'));
  const stock=createRequire(require.resolve('@deepseek-ai/dsh/package.json'));
  const base=createRequire(stock.resolve('@deepseek-ai/dsh-base/package.json'));
  const manifest=base.resolve('@deepseek-ai/dsh-tool-web/package.json');
  const version=JSON.parse(readFileSync(manifest,'utf8')).version;
  if(version!=='0.2.1-alpha.2')throw Error('Unreviewed web tool version: '+version);
  const target=join(dirname(manifest),'lib/index.js');
  const before=readFileSync(target,'utf8');
  const backup=join(deployment,'runtime-patch-backups',`dsh-tool-web-${version}-index.js.original`);
  const pristine=existsSync(backup)?readFileSync(backup,'utf8'):before;
  if(createHash('sha256').update(pristine).digest('hex').toUpperCase()!==PRISTINE_SHA256)
    throw Error('Unreviewed pristine web tool source; refusing a blind patch');
  const after=patchWebFetchEvidence(pristine);
  if(before!==pristine&&before!==after)throw Error('Installed web tool has unrelated drift');
  if(!existsSync(backup)){mkdirSync(dirname(backup),{recursive:true});writeFileSync(backup,pristine);}
  if(before!==after)writeFileSync(target,after);
  if(readFileSync(target,'utf8')!==after)throw Error('web_fetch evidence patch readback failed');
  return {changed:before!==after,version,target};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(ensureWebFetchEvidencePatch()));
