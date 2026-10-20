import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';

export const PATCHED_VERSION='0.2.1-rc.2';
export const PRISTINE_SHA256='2F5DD07CB5C744A29ABBB8003A8A4CEFD9E582C6E2538074CA299A0DDD02A3BF';
export const INTERRUPTED_COMMAND_MARKER='Interrupted by previous runtime shutdown';

const original=[
  'function interruptedTurnClosers(events) {',
  '\treturn openTurnClosers(events, { kind: "interrupted" });',
  '}'
].join('\n');

const replacement=[
  'function interruptedTurnClosers(events) {',
  '\tconst pendingCommands = new Map();',
  '\tfor (const event of events) {',
  '\t\tconst commandId = event.data?.commandId;',
  '\t\tif (event.type === "command/run" && typeof commandId === "string") pendingCommands.set(commandId, event);',
  '\t\telse if (event.type === "command/done" && typeof commandId === "string") pendingCommands.delete(commandId);',
  '\t}',
  '\tconst commandClosers = [];',
  '\tconst last = events.at(-1);',
  '\tif (last !== void 0) {',
  '\t\tlet seq = last.seq + 1;',
  '\t\tfor (const commandId of pendingCommands.keys()) commandClosers.push({',
  '\t\t\ttype: "command/done",',
  '\t\t\tseq: seq++,',
  '\t\t\ttime: last.time,',
  '\t\t\tdata: {',
  '\t\t\t\tcommandId,',
  '\t\t\t\tkind: "error",',
  '\t\t\t\ttext: "Interrupted by previous runtime shutdown",',
  '\t\t\t}',
  '\t\t});',
  '\t}',
  '\tconst eventsWithCommandClosers = commandClosers.length === 0 ? events : [...events, ...commandClosers];',
  '\treturn [...commandClosers, ...openTurnClosers(eventsWithCommandClosers, { kind: "interrupted" })];',
  '}'
].join('\n');

const root=dirname(fileURLToPath(import.meta.url));
const count=(source,needle)=>source.split(needle).length-1;

export function patchInterruptedCommandRecovery(source){
  if(count(source,replacement)===1&&count(source,original)===0)return source;
  if(source.includes(INTERRUPTED_COMMAND_MARKER))throw Error('Partially patched dsh-session interrupted command recovery; refusing to continue.');
  if(count(source,original)!==1)throw Error('Unexpected dsh-session interruptedTurnClosers implementation; refusing a blind patch.');
  return source.replace(original,replacement);
}

export function locateSession(rootDir=root){
  const require=createRequire(join(rootDir,'package.json'));
  const cliPackage=require.resolve('@deepseek-ai/dsh/package.json');
  const sessionPackage=createRequire(cliPackage).resolve('@deepseek-ai/dsh-session/package.json');
  const version=JSON.parse(readFileSync(sessionPackage,'utf8')).version;
  if(version!==PATCHED_VERSION)throw Error(`Unreviewed @deepseek-ai/dsh-session version ${version}; expected ${PATCHED_VERSION}.`);
  return {target:join(dirname(sessionPackage),'lib','index.js'),version};
}

export function ensureInterruptedCommandRecoveryPatch(rootDir=root){
  const {target,version}=locateSession(rootDir);
  const before=readFileSync(target,'utf8');
  const after=patchInterruptedCommandRecovery(before);
  const backupDir=join(rootDir,'runtime-patch-backups');
  const backup=join(backupDir,`dsh-session-${version}-index.js.original`);
  const pristine=existsSync(backup)?readFileSync(backup,'utf8'):before;
  const digest=createHash('sha256').update(pristine).digest('hex').toUpperCase();
  if(digest!==PRISTINE_SHA256)throw Error(`Pristine dsh-session source expected ${PRISTINE_SHA256} but found ${digest}; refusing a blind patch.`);
  if(after!==patchInterruptedCommandRecovery(pristine))throw Error('Installed dsh-session differs from the reviewed complete patch; refusing unreviewed drift.');
  if(!existsSync(backup)){mkdirSync(backupDir,{recursive:true});writeFileSync(backup,pristine);}
  if(before!==after)writeFileSync(target,after);
  const readback=readFileSync(target,'utf8');
  if(readback!==after||!readback.includes(replacement))throw Error('dsh-session interrupted command recovery patch readback failed.');
  return {changed:before!==after,version,target,backup,pristineSha256:digest};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(ensureInterruptedCommandRecoveryPatch()));
