// Additive human slash command. No tools, auto-execution, credentials, file writes,
// model calls, role changes, or direct journal edits. Native goals owns persistence.
export const name = 'scott-verdict-goal-limit-command';
export const inject = ['commands', 'goals'];
export const GOAL_ID = 'goal-OWNER-SPECIFIC-NOT-EXPORTED';
const ref = g => ({ id: g.id, revision: g.revision });
const error = text => ({ kind: 'error', text });

export function execute(ctx, invocation) {
  if (invocation.rawInput.trim() !== '512' || invocation.attachments?.length)
    return error('Usage: /verdict-goal-limit 512 (no attachments). Only Scott\'s existing Verdict goal is eligible.');
  let edited = false;
  try {
    const before = ctx.goals.get(invocation.agent);
    if (!before || before.id !== GOAL_ID) return error('Refused: this session does not own the authorized Verdict goal.');
    if (before.maxGoalRounds !== 256 && before.maxGoalRounds !== 512)
      return error('Refused: unexpected limit; inspect the goal without replacing it.');
    if (before.maxGoalRounds === 512 && before.phase === 'active' && before.activation === 'armed')
      return { kind: 'success', text: `Already armed: ${before.id}; rounds ${before.roundsStarted}/512. No changes.` };
    if (before.phase !== 'blocked' || before.blockedReason?.code !== 'round-limit')
      return error('Refused: only a round-limit block may be repaired; pause, stop, completion and other blockers are preserved.');
    if (before.roundsStarted >= 512) return error('Refused: the authorized 512-round cap is already exhausted.');
    let current = before;
    if (current.maxGoalRounds === 256) {
      current = ctx.goals.edit(invocation.agent, ref(current), { maxGoalRounds: 512 });
      edited = true;
    }
    if (current.id !== before.id || current.objective !== before.objective || current.roundsStarted !== before.roundsStarted)
      return error('Native edit returned unexpected identity/objective/count; not resuming. Inspect the native goal journal.');
    ctx.goals.resume(invocation.agent, ref(current));
    const after = ctx.goals.get(invocation.agent);
    if (!after || after.id !== before.id || after.objective !== before.objective || after.maxGoalRounds !== 512 || after.roundsStarted < before.roundsStarted || after.phase !== 'active' || after.activation !== 'armed')
      return error('Resume was requested but active/armed readback was not confirmed. Inspect native state; do not recreate the goal.');
    return { kind: 'success', text: `Existing Verdict goal resumed.\nGoal: ${after.id}\nRevision: ${after.revision}\nStatus: ${after.phase}\nActivation: ${after.activation}\nRounds: ${after.roundsStarted}/${after.maxGoalRounds}\nPrior count: ${before.roundsStarted} (not reset)\nObjective unchanged. Native goal service retained its journal and evidence.` };
  } catch (e) {
    return error(`${edited ? 'Limit edit succeeded; subsequent resume/readback failed.' : 'Goal repair failed.'} ${e?.code || e?.name || 'Error'}. Read /goal before retrying; do not replace it.`);
  }
}

export function apply(ctx) {
  ctx.commands.register({
    definitionId: 'scott-verdict-goal-limit-command',
    name: 'verdict-goal-limit',
    description: 'Human-authorized repair of the existing Verdict goal cap to 512; preserve used rounds and evidence',
    input: { hint: '512', attachments: false },
    handler: invocation => execute(ctx, invocation)
  });
}
