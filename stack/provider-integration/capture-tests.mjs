// Canonical build-fixture tests. Requires the README's pinned dependencies and picker template.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const tests=['cli-provider.test.mjs','cli-runtime.test.mjs','cli-metrics.test.mjs','native-continuity.test.mjs','session-selection/store.test.mjs','picker/filter-models.test.mjs','picker/component.test.mjs','picker/default-directory.test.mjs','conversation-metrics/patch.test.mjs'];
const started=new Date().toISOString();
const result=spawnSync(process.execPath,['--test',...tests],{cwd:import.meta.dirname,encoding:'utf8',timeout:60000});
const report={started,finished:new Date().toISOString(),node:process.version,exit:result.status,error:result.error?.message??null,tests:tests.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(import.meta.dirname,file))).digest('hex')}))};
const out=path.join(import.meta.dirname,'evidence');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'canonical-acceptance.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(out,'canonical-acceptance.txt'),(result.stdout??'')+(result.stderr??''));
console.log((result.stdout??'').split('\n').slice(-10).join('\n'));if(result.stderr)console.error(result.stderr);process.exitCode=result.status??1;
