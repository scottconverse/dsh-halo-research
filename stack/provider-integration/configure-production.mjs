import fs from 'node:fs';import path from 'node:path';import {configureProvider} from './configure-provider.mjs';
const root=path.join(process.env.USERPROFILE,'.dsh/provider-runtime'),file=path.join(root,'credentials.json');
const secret=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
if(secret.origin&&secret.origin!=='http://127.0.0.1:20130')throw Error('Credential origin mismatch');
const report=await configureProvider({origin:'http://127.0.0.1:20130',secret,saveSecret:value=>fs.writeFileSync(file,JSON.stringify(value,null,2))});
report.evidence='Production management API catalog and bootstrap only; account availability must be verified on use.';
fs.writeFileSync(path.join(root,'catalog.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({modelCount:report.modelCount,upstreamCalls:false,cloudSyncCanSend:report.cloudSyncCanSend,credentialFile:file}));
