import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
test('host remote loads against the running DSH runtime outside the DEV home layout',()=>{
 const entry=path.resolve('stack/halo-router-dev/node_modules/@deepseek-ai/dsh/lib/bin.js');
 const host=pathToFileURL(path.resolve('stack/halo-routing/ui/host.mjs')).href;
 const run=spawnSync(process.execPath,['--input-type=module','-e',`process.argv[1]=${JSON.stringify(entry)};await import(${JSON.stringify(host)});`],{encoding:'utf8',env:{...process.env,DSH_HOME:path.resolve('C:/Users/scott/.dsh')}});
 assert.equal(run.status,0,run.stderr);
});
