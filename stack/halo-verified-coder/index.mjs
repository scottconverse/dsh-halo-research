import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { runGatedUnit } from './gate-core.mjs'

export const name = 'halo-verified-coder'
export const inject = ['tools', 'subagents', 'agents']

const verdictByAgent = new WeakMap()
const workerToolFilter = { allow: ['read', 'write', 'edit', 'glob', 'grep', 'pwsh'] }
const parentMutationTools = new Set(['subagent_coder', 'write', 'edit', 'pwsh', 'bash'])
const workerPersona = `You are the Halo implementation worker. Implement the supplied bounded unit directly and concisely.
Use only the files and commands needed for that unit. Do not create plans, goals, subagents, or repository-root test fixtures.
Put every temporary file under the supplied .halo-scratch directory. Run the named verification command when practical,
then report the files changed and observed command output. Never claim the gate passed; the mechanical verifier decides.`

function textOf(output) {
  return output.filter(block => block?.type === 'text').map(block => block.text).join('')
}

export function apply(ctx, config = {}) {
  const provider = config.provider ?? 'spawn'
  const model = config.model ?? 'halo/qwen3-coder-30b-a3b'
  const runRoot = config.runRoot ?? join(process.env.LOCALAPPDATA ?? process.cwd(), 'HaloGate', 'runs')
  const verifyTimeoutMs = config.verifyTimeoutMs ?? 180_000

  ctx.on('tools/pre-execute', async (exec, next) => {
    if (!exec.agent) return next()
    const verdict = verdictByAgent.get(exec.agent)
    if (verdict?.armed && parentMutationTools.has(exec.name)) {
      return { kind: 'deny', reason: `Halo coding unit is closed after its single gate call (${verdict.status}). Start a new bounded unit instead of retrying or editing around the verdict. Evidence: ${verdict.auditPath ?? 'pending'}` }
    }
    if (exec.name !== 'update_goal' || exec.arguments?.action !== 'complete') return next()
    if (verdict?.armed && verdict.status !== 'PASS') {
      return { kind: 'deny', reason: `Halo verification gate refuses completion: last verdict is ${verdict.status}. Evidence: ${verdict.auditPath ?? 'unavailable'}` }
    }
    return next()
  })

  ctx.tools.register({
    name: 'subagent_coder',
    description: 'Run the tuned local Coder in an isolated staging worktree, verify its changes against protected tests, and promote only a passing result. The call waits for the mechanically verified verdict.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['description', 'prompt', 'editable_paths', 'protected_paths', 'verify_executable', 'verify_args'],
      properties: {
        description: { type: 'string', description: 'Short implementation-unit label.' },
        prompt: { type: 'string', description: 'Complete self-contained implementation brief.' },
        editable_paths: { type: 'array', items: { type: 'string' }, description: 'Repository-relative files or directories the worker may change.' },
        protected_paths: { type: 'array', items: { type: 'string' }, description: 'Existing repository-relative tests and verifier inputs the worker must not change.' },
        verify_executable: { type: 'string', description: 'Verifier executable, without a shell.' },
        verify_args: { type: 'array', items: { type: 'string' }, description: 'Exact verifier argument vector.' },
      },
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
        async runWorker({ stage, scratch, round, feedback }) {
          const agentPresets = parent.ctx?.get?.('agentPresets')
          const parentPreset = agentPresets?.composedPreset(parent.ctx)
          const staging = await ctx.agents.create({
            sessionId: `halo-gate-${randomUUID()}`,
            meta: {
              cwd: stage,
              parentSession: parent.session.id,
              ...(parentPreset === undefined ? {} : { agentPreset: parentPreset }),
            },
            agentOptions: { provider: 'lmstudio', model },
            setup(agentCtx) {
              // A programmatic agent starts with only host-global tools. Join
              // the real cockpit preset before using it as the worker parent,
              // exactly as DSH's native in-process child driver does.
              agentCtx.get?.('agentPresets')?.composeFrom(agentCtx, parent.ctx)
              agentCtx.agent.session.append('sandbox/mode', { mode: 'workspace-write' })
            },
          })
          let run
          try {
            const repair = feedback ? `\n\nPrevious gate failure to repair:\n${feedback}` : ''
            run = await ctx.subagents.start(provider, {
              label: `${args.description} (gate round ${round})`,
              prompt: [{ type: 'text', text: `${args.prompt}\n\nWork only in ${stage}. You may change only: ${args.editable_paths.join(', ')}. Never change protected paths: ${args.protected_paths.join(', ')}. Put all temporary fixtures, generated samples, and test scratch under ${scratch}; for pytest add --basetemp ${join(scratch, 'pytest')}. Do not create any temporary file elsewhere in the repository. Run the named verification command when practical, but do not claim the unit is complete; the mechanical gate decides that.${repair}` }],
              parent: staging.agent,
              agentOptions: { provider: 'lmstudio', model, maxTokens: 8192 },
              persona: workerPersona,
              toolFilter: workerToolFilter,
              // DSH numbers the direct child at depth 1. The absolute cap must
              // therefore be 1 for this one worker launch.
              maxDepth: 1,
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
