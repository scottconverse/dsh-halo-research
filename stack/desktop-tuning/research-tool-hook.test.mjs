import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {extendEvidenceSchema} from './research-tool-hook.mjs';
const require=createRequire(new URL('../stock-dsh/package.json',import.meta.url));
const stock=createRequire(require.resolve('@deepseek-ai/dsh/package.json'));
const base=createRequire(stock.resolve('@deepseek-ai/dsh-base/package.json'));
const web=base('@deepseek-ai/dsh-tool-web');
const {validateJsonSchemaValue}=base('@deepseek-ai/dsh-tools');
test('Desktop evidence extension preserves the closed stock output contract',()=>{
 let tool;web.applyWebFetchTool({systemPrompt:{section(){},getSectionOrder(){return 0}},tools:{register(t){tool=t}}},30000,14000);
 const before=structuredClone(tool.output.schema);
 extendEvidenceSchema(tool);const schema=tool.output.schema;
 for(const [key,value] of Object.entries(before.properties))if(!['coverage','evidenceFile'].includes(key))assert.deepEqual(schema.properties[key],value);
 assert.equal(schema.additionalProperties,false);
 const value={url:'https://www.reddit.com/r/Longmont/comments/abc/story/',statusCode:200,body:{kind:'text',content:'partial'},truncated:false,evidenceFile:'evidence.json',coverage:'partial'};
 assert.deepEqual(validateJsonSchemaValue(schema,value),[]);
 for(const bad of [{...value,evidenceFile:42},{...value,coverage:{}},{...value,arbitrary:true}])assert.ok(validateJsonSchemaValue(schema,bad).length);
 extendEvidenceSchema(tool);assert.deepEqual(tool.output.schema,schema);
});
test('unknown or conflicting contracts fail before extending tool output',()=>{
 assert.throws(()=>extendEvidenceSchema({name:'other'}),/Unrecognized/);
 assert.throws(()=>extendEvidenceSchema({name:'web_fetch',output:{schema:{type:'object',additionalProperties:false,properties:{url:{type:'string'},truncated:{type:'boolean'},coverage:{type:'object'}}}}}),/Conflicting/);
});
