import test from 'node:test';
import assert from 'node:assert/strict';
import {originalRoute,applyRoute} from '../stack/halo-routing/request-route.mjs';
test('a manual pin without effort preserves the resolved effort of that same model',()=>{
 assert.deepEqual(originalRoute({provider:'a',model:'m',reasoningEffort:'high'},{provider:'a',model:'m'}),{provider:'a',model:'m',reasoningEffort:'high'});
});
test('changing models never inherits the previous models reasoning',()=>{
 assert.deepEqual(applyRoute({provider:'a',model:'m',reasoningEffort:'high',maxTokens:9000},{provider:'b',model:'n'}),{provider:'b',model:'n',maxTokens:9000});
 assert.deepEqual(originalRoute({provider:'a',model:'m',reasoningEffort:'high'},{provider:'b',model:'n'}),{provider:'b',model:'n'});
});
test('explicit effort wins while unrelated DSH request settings survive',()=>{
 assert.equal(originalRoute({provider:'a',model:'m',reasoningEffort:'high'},{provider:'a',model:'m',reasoningEffort:'low'}).reasoningEffort,'low');
 assert.deepEqual(applyRoute({provider:'a',model:'m',reasoningEffort:'high',maxTokens:9000},{provider:'b',model:'n',reasoningEffort:'medium',decisionId:'private'}),{provider:'b',model:'n',reasoningEffort:'medium',maxTokens:9000});
});
