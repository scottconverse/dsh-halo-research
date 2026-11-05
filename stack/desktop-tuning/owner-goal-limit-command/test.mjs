import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execute, apply, GOAL_ID } from './index.mjs';
function fixture(overrides = {}, failure) {
  let state = { id: GOAL_ID, revision: 3, phase: 'blocked', activation: 'disarmed', blockedReason: {code:'round-limit'}, roundsStarted:256, maxGoalRounds:256, objective:'Preserved bounded Verdict contract', ...overrides };
  const calls = [], agent = {};
  const ctx = { goals: {
    get(a) { assert.equal(a, agent); return structuredClone(state); },
    edit(a, r, request) {
      assert.equal(a, agent); assert.deepEqual(r, {id:state.id, revision:state.revision});
      assert.deepEqual(request,{maxGoalRounds:512}); calls.push('edit');
      if(failure === 'edit') throw new Error('conflict');
      state = {...state,...request,revision:state.revision+1}; return structuredClone(state);
    },
    resume(a,r) {
      assert.equal(a,agent); assert.deepEqual(r,{id:state.id,revision:state.revision}); calls.push('resume');
      if(failure === 'resume') throw new Error('conflict');
      state={...state,phase:'active',activation:'armed',revision:state.revision+1}; return structuredClone(state);
    }
  }};
  return {ctx,calls,invoke: (rawInput='512',attachments=[]) => execute(ctx,{agent,rawInput,attachments}), state:()=>state};
}
test('native edit then fresh-revision resume preserves identity, objective and used count',()=>{
  const f=fixture(); assert.equal(f.invoke().kind,'success'); assert.deepEqual(f.calls,['edit','resume']);
  assert.equal(f.state().id,GOAL_ID); assert.equal(f.state().roundsStarted,256);
  assert.equal(f.state().objective,'Preserved bounded Verdict contract'); assert.equal(f.state().revision,5);
  assert.equal(f.state().activation,'armed'); assert.equal(f.state().maxGoalRounds,512);
  assert.equal(f.invoke().kind,'success'); assert.deepEqual(f.calls,['edit','resume']);
});
test('wrong session, human pause, other blocker, completion and exhausted cap are refused',()=>{
  for(const state of [{id:'other'}, {phase:'paused'}, {phase:'complete'}, {phase:'active',activation:'disarmed'}, {blockedReason:{code:'user'}}, {roundsStarted:512,maxGoalRounds:512}, {maxGoalRounds:1024}]) {
    const f=fixture(state); assert.equal(f.invoke().kind,'error'); assert.deepEqual(f.calls,[]);
  }
});
test('only exact authorized argument and no attachments',()=>{
  for(const arg of ['', '1024', '512 resume']) {const f=fixture(); assert.equal(f.invoke(arg).kind,'error'); assert.deepEqual(f.calls,[]);}
  const f=fixture(); assert.equal(f.invoke('512',[{}]).kind,'error'); assert.deepEqual(f.calls,[]);
});
test('edit conflict cannot resume; partial edit has honest recovery and no reset',()=>{
  const a=fixture({},'edit'); assert.equal(a.invoke().kind,'error'); assert.deepEqual(a.calls,['edit']);
  const b=fixture({},'resume'); const result=b.invoke(); assert.equal(result.kind,'error'); assert.match(result.text,/Limit edit succeeded/);
  assert.equal(b.state().roundsStarted,256); assert.equal(b.state().maxGoalRounds,512);
  const c=fixture({maxGoalRounds:512,revision:4}); assert.equal(c.invoke().kind,'success'); assert.deepEqual(c.calls,['resume']);
});
test('loading only registers a human command; never mutates or adds a model tool',()=>{
  const registrations=[]; apply({commands:{register:x=>registrations.push(x)}});
  assert.equal(registrations.length,1); assert.equal(registrations[0].name,'verdict-goal-limit');
  assert.equal(typeof registrations[0].handler,'function');
});
