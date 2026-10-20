import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {workspaceKey,repair,readArchive,archiveSource} from '../workspace-path-patch.mjs';
const archive=readArchive('C:/Users/scott/AppData/Local/Programs/DeepSeek Harness/resources/app.asar');
const source=name=>archiveSource(archive,'dsh/node_modules/@deepseek-ai/'+name+'/lib/index.js');
function fn(s,name){const at=s.indexOf('function '+name+'(');assert(at>=0,name);const end=s.indexOf('\n}',at);assert(end>=0);return s.slice(at,end+2);}
function load(name,s,functions){const patched=repair(name,s);const context=vm.createContext({workspaceKey,path,process});return vm.runInContext(functions.map(n=>fn(patched,n)).join('\n')+'\n({'+functions.join(',')+'})',context);}
const originalCore=source('dsh-session-query'),core=load('dsh-session-query',originalCore,['sessionPredicate']);
const originalSql=source('dsh-session-query-sqlite'),sql=load('dsh-session-query-sqlite',originalSql,['buildSessionWhere','addNullableList','appendListBindings','assertPortableBindingCount','assertFts5OuterPredicateCount']);
const toolPath='C:/Users/scott/Documents/Codex/2026-09-25/dsh-desktop-eval/home/profiles/desktop/node_modules/@deepseek-ai/dsh-tool-session-query/lib/index.js';
const tool=load('dsh-tool-session-query',fs.readFileSync(toolPath,'utf8'),['headerAuthorized']);
const db=new DatabaseSync('C:/Users/scott/Documents/Codex/2026-10-20/desktop-real-tools/home/session-search.db',{readOnly:true});db.function('halo_workspace_key',{deterministic:true},v=>workspaceKey(v));
const target='session-326bc19c-34ad-4138-940f-d483d727e1ea';const stored=db.prepare('SELECT cwd FROM persisted_sessions WHERE id=?').get(target).cwd;const caller=stored.replaceAll('\\','/');assert.notEqual(stored,caller);
assert.equal(db.prepare('SELECT count(*) n FROM persisted_sessions WHERE id=? AND cwd=?').get(target,caller).n,0);
const predicate=sql.buildSessionWhere([{kind:'cwd',values:[caller]}]);const hits=db.prepare('SELECT id FROM persisted_sessions WHERE id=? AND '+predicate.sql).all(target,...predicate.params);assert.deepEqual(hits.map(x=>x.id),[target]);
assert(core.sessionPredicate({kind:'cwd',values:[caller]})({header:{cwd:stored}}));
assert(tool.headerAuthorized({id:target,cwd:stored},{id:'caller',header:{cwd:caller}}));
for(const other of [caller+'-other',caller+'/child']){assert(!tool.headerAuthorized({id:target,cwd:other},{id:'caller',header:{cwd:caller}}));assert(!core.sessionPredicate({kind:'cwd',values:[caller]})({header:{cwd:other}}));const p=sql.buildSessionWhere([{kind:'cwd',values:[other]}]);assert.equal(db.prepare('SELECT count(*) n FROM persisted_sessions WHERE id=? AND '+p.sql).get(target,...p.params).n,0);}
assert.equal(workspaceKey(null),null);assert.equal(workspaceKey('relative\\folder'),'relative\\folder');assert.equal(workspaceKey('/home/user/A','linux'),'/home/user/A');assert.notEqual(workspaceKey('/home/user/A','linux'),workspaceKey('/home/user/a','linux'));
assert.equal(workspaceKey('C:/folder/'),workspaceKey('C:\\folder'));assert.equal(workspaceKey('C:/'),workspaceKey('C:\\'));assert.equal(workspaceKey('//server/share/folder/'),workspaceKey('\\\\server\\share\\folder'));assert.notEqual(workspaceKey('C:/Folder'),workspaceKey('C:/folder'));
for(const name of ['dsh-session-query','dsh-session-query-sqlite','dsh-tool-session-query']){const s=source(name),p=repair(name,s);assert.equal(repair(name,p),p);new vm.SourceTextModule(p);}
const text=db.prepare("SELECT text FROM persisted_docs WHERE session_id=? AND seq=31 AND type='assistant/message'").get(target).text;assert(text.includes('LIME-AUTO-20'));db.close();
console.log(JSON.stringify({result:'PASS',originalExactSqlMatches:0,patchedSqlMatches:1,matchedSession:target,matchedEvent:31,coreFilter:'PASS',toolAuthorization:'PASS',otherFoldersDenied:true,casePreserved:true,nonWindowsUnchanged:true,normalModelJobs:0},null,2));
