// Read-only operator summary. Full evaluations stay available by reference.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const rows=JSON.parse(await readFile(path.join(root,'home/halo-routing/records.json'),'utf8'));
const evaluations=new Map(rows.filter(r=>r.kind==='evaluation').map(r=>[r.evaluationId,r]));
const limit=Number(process.argv[2]??10);
for(const observation of rows.filter(r=>r.kind==='observation').slice(-limit)){
 const recommendation=rows.find(r=>r.kind==='recommendation'&&r.observationId===observation.observationId);
 const evaluation=evaluations.get(recommendation?.evaluationId)??recommendation;
 const measurement=rows.find(r=>r.kind==='measurement'&&r.observationId===observation.observationId);
 console.log(JSON.stringify({observationId:observation.observationId,sessionId:observation.sessionId,actual:observation.actual,selectionSource:observation.selectionSource,qualificationState:'unknown',recommendation:evaluation??'unavailable',measurement:measurement??'unavailable',outcomes:rows.filter(r=>r.kind==='outcome'&&r.observationId===observation.observationId)},null,2));
}
