export function patchSelection(source){
 const start='\t\tlet picked;',set='\t\t\t\tpicked = next;';
 if(source.split(start).length!==2||source.split(set).length!==2||source.includes('halo-selection'))throw Error('Unsupported selection bundle; review upstream');
 return `import {readSelection,saveSelection} from './halo-selection.js';\n`+source.replace(start,'\t\tlet picked = readSelection(agent.session.id);').replace(set,'\t\t\t\tsaveSelection(agent.session.id, next);\n'+set);
}
