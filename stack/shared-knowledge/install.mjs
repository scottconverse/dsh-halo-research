import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const stack = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function initializeKnowledge(root) {
  root = path.resolve(root);
  const library = path.join(root, 'knowledge-library');
  const skills = path.join(root, 'home/skills');
  const targets = [library, ...['knowledge-ingest','knowledge-query'].map(name => path.join(skills,name))];
  if (targets.some(p => fs.existsSync(p))) throw Error('Knowledge destination exists; refusing to overwrite library or skills');
  const render = text => text.replaceAll('C:/Users/scott/Documents/DSH Knowledge Library',library.replaceAll('\\','/')).replaceAll('C:\\Users\\scott\\Documents\\DSH Knowledge Library',library.replaceAll("'","''")).replaceAll("Scott's shared",'the shared');
  // Only explicit public templates and two skills; never copy a private corpus.
  const files = ['README.md','LIBRARY-RULES.md','raw/.gitkeep','wiki/index.md','wiki/log.md',...['sources','concepts','entities','synthesis'].map(n=>`wiki/${n}/.gitkeep`)];
  const writes = files.map(name => [path.join(library,name),render(fs.readFileSync(path.join(stack,'stock-dsh/knowledge-library-template',name),'utf8'))]);
  for (const name of ['knowledge-ingest','knowledge-query']) writes.push([path.join(skills,name,'SKILL.md'),render(fs.readFileSync(path.join(stack,'stock-dsh/skills',name,'SKILL.md'),'utf8'))]);
  for (const [target,text] of writes) { fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,text,{flag:'wx'}); }
  return {library,skills,files:writes.length,existingNotesImported:false};
}
