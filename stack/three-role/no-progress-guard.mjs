// ISOLATED CANDIDATE ONLY. Not imported by the live triad plugin.
// Use the public turn-stopping boundary so no future goal input is claimed,
// rejected, removed, or charged while waiting for external work.
export function installNoProgressGuard(ctx, membership) {
  // Reading the same status is not new work. Unknown/action tools remain
  // conservative progress signals; this never interprets assistant prose.
  const reads = new Set(['get_goal', 'triad_status', 'triad_events', 'triad_read',
    'triad_git', 'triad_list', 'triad_hash', 'triad_coder_events', 'triad_wait']);
  const states = new Map();
  const disposers = [];
  let disposed = false;
  const state = id => {
    if (!states.has(id)) states.set(id, { streak: 0, turn: undefined, automatic: false, tools: false, counted: false });
    return states.get(id);
  };
  const wake = s => { s.streak = 0; s.release?.(); };
  const pending = agent => agent.inbox.nextTurn.length > 0 || agent.inbox.nextStep.length > 0;
  const on = (name, fn) => disposers.push(ctx.on(name, fn));

  on('session/event', (session, event) => {
    const member = membership(session.id);
    if (!member) return;
    if (member.role !== 'coordinator') {
      if (event.type === 'turn/end') {
        for (const [id, s] of states) {
          if (membership(id)?.projectId === member.projectId) wake(s);
        }
      }
      return;
    }
    const s = state(session.id);
    if (event.type === 'turn/start') {
      s.turn = event.data.turn; s.automatic = false; s.tools = false; s.counted = false;
    } else if (event.type === 'user/message') {
      if (event.data.source?.kind === 'goal' && event.data.source.round > 0) s.automatic = true;
      else wake(s);
    } else if (event.type === 'tool/call' && !reads.has(event.data.name)) s.tools = true;
    else if (event.type === 'turn/end' && event.data.reason?.kind !== 'completed') wake(s);
  });
  on('agent/inbox/inserted', ({ agent, message }) => {
    if (message.source?.kind !== 'goal') {
      const s = states.get(agent.id); if (s) wake(s);
    }
  });
  on('goal/changed', ({ agent }) => {
    const s = states.get(agent.id); if (s) wake(s);
  });
  on('agent/turn-stopping', async ({ agent, turn, signal }) => {
    if (disposed || membership(agent.id)?.role !== 'coordinator') return;
    const s = state(agent.id);
    if (s.turn !== turn || s.counted) return;
    s.counted = true;
    if (!s.automatic || s.tools || pending(agent)) { s.streak = 0; return; }
    s.streak++;
    const goal = ctx.goals.get(agent);
    // Leave pause, completion, disarm and cap exhaustion to the native driver.
    if (s.streak < 2 || !goal || goal.phase !== 'active' || goal.activation !== 'armed' || goal.roundsStarted >= goal.maxGoalRounds) return;
    if (signal.aborted) return;
    await new Promise(resolve => {
      const release = () => {
        signal.removeEventListener('abort', release);
        if (s.release === release) delete s.release;
        resolve();
      };
      s.release = release;
      signal.addEventListener('abort', release, { once: true });
      // Recheck after registration to cover a previously queued normal input.
      if (disposed || signal.aborted || pending(agent)) release();
    });
  });
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const s of states.values()) wake(s);
    for (const remove of disposers.splice(0)) remove();
    states.clear();
  };
  return dispose;
}
