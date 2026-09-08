// Explicit, bounded connection smoke; not a model-quality benchmark.
import {enqueueAcceptanceRequest} from '../halo-router-dev/acceptance-client.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const evidence=new URL('./gateway-evidence/',import.meta.url);
await mkdir(evidence,{recursive:true});
const result=await enqueueAcceptanceRequest({action:'root-turn',provider:'lmstudio',model:'halo/qwen3.6-35b-a3b',cwd:'C:/Users/scott/.dsh',timeoutMs:180000,routingSettings:{mode:'manual'},prompt:'Connection test: use the Halo Research Gateway web_search tool to search for the official Model Context Protocol documentation. Then use its web_fetch tool to read https://example.com. Report the title from that page and one URL from the search. Do not use shell or browser alternatives. Keep the final answer under 80 words.'},{home:'C:/Users/scott/.dsh'});
await writeFile(new URL('dsh-live.json',evidence),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,sessionId:result.parentSessionId,durationMs:result.durationMs,finalText:result.finalText,error:result.error}));
if(result.status!=='completed')process.exitCode=1;
