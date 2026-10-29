// Installed Cordis and DSH agent dispatch; no host, provider, live session or model.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { realpathSync } from 'node:fs';
import { installNoProgressGuard } from './no-progress-guard.mjs';
const runtime = process.env.DSH_RUNTIME_ROOT ?? fileURLToPath(new URL('../stock-dsh', import.meta.url));
const req = createRequire(realpathSync(join(runtime,'node_modules/@deepseek-ai/dsh/package.json')));
const { Context } = await import(pathToFileURL(req.resolve('@deepseek-ai/cordis')));
const { agentEvents } = await import(pathToFileURL(req.resolve('@deepseek-ai/dsh-agent')));

test('installed native agent dispatcher holds status churn and accepts queued input', async () => {
  const ctx = new Context();
  const goal={id:'fixture-only',revision:5,phase:'active',activation:'armed',roundsStarted:20,maxGoalRounds:512};
  const removeGoals=ctx.provide('goals',{get:()=>goal});
  const agent={id:'fixture-coordinator',inbox:{nextTurn:[],nextStep:[]}};
  const events=agentEvents(ctx,agent);
  const dispose=installNoProgressGuard(ctx,id=>id===agent.id?{role:'coordinator',projectId:'fixture'}:undefined);
  const abort=new AbortController();
  async function turn(n) {
    ctx.emit('session/event', {id:agent.id}, {type:'turn/start',data:{turn:n}});
    ctx.emit('session/event', {id:agent.id}, {type:'user/message',data:{source:{kind:'goal',round:n}}});
    ctx.emit('session/event', {id:agent.id}, {type:'tool/call',data:{name:'triad_status'}});
    return events.serial('agent/turn-stopping',{turn:n,signal:abort.signal});
  }
  try {
    await turn(1);
    let ended=false;const wait=turn(2).then(()=>{ended=true;});
    await new Promise(resolve=>setImmediate(resolve));assert.equal(ended,false);
    const input={id:'fixture-human',source:{kind:'human'}};agent.inbox.nextTurn.push(input);
    events.emit('agent/inbox/inserted',{message:input});await wait;
    assert.deepEqual(agent.inbox.nextTurn,[input]);assert.equal(goal.roundsStarted,20);
    agent.inbox.nextTurn.length=0;
    await turn(3);const held=turn(4);dispose();await held;
    assert.equal(goal.revision,5);assert.equal(goal.activation,'armed');
  } finally {abort.abort();dispose();await removeGoals();}
});
