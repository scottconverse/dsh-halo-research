import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {patchSelection} from './patch.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const source=path.resolve(here,'../dsh-tools/node_modules/.pnpm/@deepseek-ai+dsh-host-apipr_59108f441fb214ee94c40ab75c436a3b/node_modules/@deepseek-ai/dsh-host-apiproxy');
const original=fs.readFileSync(path.join(source,'lib/index.js'),'utf8');
if(createHash('sha256').update(original).digest('hex')!=='8e32ffc951f499849c155e30cb30813af5ed7abb11008653125092299b693d9f')throw Error('Upstream changed');
const target=path.join(here,'package');fs.mkdirSync(target,{recursive:true});fs.cpSync(path.join(source,'lib'),path.join(target,'lib'),{recursive:true});
fs.writeFileSync(path.join(target,'lib/index.js'),patchSelection(original));fs.copyFileSync(path.join(here,'store.mjs'),path.join(target,'lib/halo-selection.js'));
fs.copyFileSync(path.join(source,'LICENSE'),path.join(target,'LICENSE'));
const manifest=JSON.parse(fs.readFileSync(path.join(source,'package.json'),'utf8'));fs.writeFileSync(path.join(target,'package.json'),JSON.stringify({...manifest,files:[...manifest.files,'lib/halo-selection.js'],version:'0.1.1-rc.2-halo-selection.3'},null,2));
