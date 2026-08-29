import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { runGatedUnit } from './gate-core.mjs'

export const name = 'halo-verified-coder'
export const inject = ['tools', 'subagents', 'agents']

const verdictByAgent = new WeakMap()

function textOf(output) {
  return output.filter(block => block?.type === 'text').map(block => block.text).join('')
}

export function apply(ctx, config = {}) {
  const provider = config.provider ?? 'spawn'
  const model = config.model ?? 'halo/qwen3-coder-30b-a3b'
  const runRoot = config.runRoot ?? join(process.env.LOCALAPPDATA ?? process.cwd(), 'HaloGate', 'runs')
  const verifyTimeoutMs = config.verifyTimeoutMs ?? 180_000

  ctx.on('tools/pre-execute', async (exec, next) => {
    if (exec.name !== 'update_goal' || exec.arguments?.action !== 'complete' || !exec.agent) return next()
    const verdict = verdictByAgent.get(exec.agent)
    if (verdict?.armed && verdict.status !== 'PASS') {
      return { kind: 'deny', reason: `Halo verification gate refuses completion: last verdict is ${verdict.status}. Evidence: ${verdict.auditPath ?? 'unavailable'}` }
    }
    return next()
  })

  ctx.tools.register({
    name: 'subagent_coder',
    description: 'Run the tuned local Coder in an isolated staging worktree, verify its changes against protected tests, and promote only a passing result. The call waits for the mechanically verified verdict.',
    parameters: {
      description: { type: 'string', required: true, description: 'Short implementation-unit label.' },
      prompt: { type: 'string', required: true, description: 'Complete self-contained implementation brief.' },
      editable_paths: { type: 'array', required: true, items: { type: 'string' }, description: 'Repository-relative files or directories the worker may change.' },
      protected_paths: { type: 'array', required: true, items: { type: 'string' }, description: 'Existing repository-relative tests and verifier inputs the worker must not change.' },
      verify_executable: { type: 'string', required: true, description: 'Verifier executable, without a shell.' },
      verify_args: { type: 'array', required: true, items: { type: 'string' }, description: 'Exact verifier argument vector.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['status', 'auditPath', 'evidence'],
        properties: {
          status: { type: 'string' },
          auditPath: { type: 'string' },
          evidence: { type: 'string' },
          changes: { type: 'array', items: { type: 'string' } },
          workerText: { type: 'string' },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `HALO VERIFIED CODER: ${value.status}\nEvidence: ${value.auditPath}\n${value.evidence}` }],
    },
    async execute(args, exec) {
      const parent = exec.agent
      if (!parent) throw new Error('subagent_coder requires a calling agent')
      verdictByAgent.set(parent, { armed: true, status: 'RUNNING' })
      const repo = parent.session.header.cwd
      const result = await runGatedUnit({
        repo,
        runRoot,
        editablePaths: args.editable_paths,
        protectedPaths: args.protected_paths,
        verifyExecutable: args.verify_executable,
        verifyArgs: args.verify_args,
        verifyTimeoutMs,
        async runWorker({ stage, round, feedback }) {
          const staging = await ctx.agents.create({
            sessionId: `halo-gate-${randomUUID()}`,
            meta: { cwd: stage, parentSession: parent.session.id },
            agentOptions: { provider: 'lmstudio', model },
            setup(agentCtx) {
              agentCtx.agent.session.append('sandbox/mode', { mode: 'workspace-write' })
            },
          })
          let run
          try {
            const repair = feedback ? `\n\nPrevious gate failure to repair:\n${feedback}` : ''
            run = await ctx.subagents.start(provider, {
              label: `${args.description} (gate round ${round})`,
              prompt: [{ type: 'text', text: `${args.prompt}\n\nWork only in ${stage}. You may change only: ${args.editable_paths.join(', ')}. Never change protected paths: ${args.protected_paths.join(', ')}. Run useful checks, but do not claim the unit is complete; the parent gate decides that.${repair}` }],
              parent: staging.agent,
              agentOptions: { provider: 'lmstudio', model, maxTokens: 8192 },
              maxDepth: 0,
              signal: exec.signal,
            })
            const terminal = await run.result
            if (terminal.stopReason !== 'completed') throw new Error(`worker stop reason: ${terminal.stopReason}; ${terminal.diagnostic ?? ''}`)
            return textOf(terminal.output)
          } finally {
            if (run) await run.dispose()
            await staging.dispose()
          }
        },
      })
      verdictByAgent.set(parent, { armed: true, status: result.status, auditPath: result.auditPath })
      return result
    },
  })
}
