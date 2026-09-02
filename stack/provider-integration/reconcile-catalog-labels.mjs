// Fresh production OmniRoute has no imported upstream connections.
// Never carry development's "configured" labels into production.
import fs from 'node:fs';import path from 'node:path';import YAML from './tools/node_modules/yaml/dist/index.js';
const file=path.join(process.env.USERPROFILE,'.dsh/settings.yaml'),doc=YAML.parseDocument(fs.readFileSync(file,'utf8'));
const models=doc.getIn(['llm-pi-ai','providers','omniroute','models']).toJSON();let changed=0;
for(const m of models)if(m.name?.includes('; configured;')){m.name=m.name.replaceAll('; configured;','; connect account;');changed++;}
doc.setIn(['llm-pi-ai','providers','omniroute','models'],models);fs.writeFileSync(file,String(doc));fs.copyFileSync(file,path.resolve(import.meta.dirname,'../halo-settings.yaml'));
console.log(JSON.stringify({changed,models:models.length}));
