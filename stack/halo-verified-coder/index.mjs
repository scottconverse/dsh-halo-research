import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { runGatedUnit, runProcess } from './gate-core.mjs'

export const name = 'halo-verified-coder'
export const inject = ['tools', 'subagents', 'agents']

const workerPersona = `You are the Halo implementation worker. Implement the supplied bounded unit directly and concisely.
You retain the native tool catalog and the caller's available machine access. Stay within the requested task;
available capabilities do not authorize unrelated actions. Use planning, research, delegation, and background jobs when useful.
Put every temporary file under the supplied .halo-scratch directory. Run the named verification command when practical,
then report the files changed and observed command output. Never claim the gate passed; the mechanical verifier decides.`

function textOf(output) {
  return output.filter(block => block?.type === 'text').map(block => block.text).join('')
}

export function apply(ctx, config = {}) {
  const provider = config.provider ?? 'spawn'
  const model = config.model ?? 'halo/qwen3-coder-30b-a3b-q4km'
  const runRoot = config.runRoot ?? join(process.env.LOCALAPPDATA ?? process.cwd(), 'HaloGate', 'runs')
  const verifyTimeoutMs = config.verifyTimeoutMs ?? 180_000

  ctx.tools.register({
    name: 'halo_preflight',
    description: 'Read-only environment preflight for a Halo build. Reports whether Git, Node, package managers, Python, and Docker CLI/daemon are actually available before the implementation brief is created.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    async execute(_args, exec) {
      const cwd = exec.agent?.session?.header?.cwd ?? process.cwd()
      const commands = {}
      for (const command of ['git.exe', 'node.exe', 'npm.cmd', 'pnpm.cmd', 'python.exe', 'py.exe', 'docker.exe']) {
        const found = await runProcess('where.exe', [command], { cwd, timeoutMs: 5_000 }).catch(() => ({ code: -1, stdout: '' }))
        commands[command] = found.code === 0 ? found.stdout.trim().split(/\r?\n/)[0] : null
      }
      const gitRoot = await runProcess('git.exe', ['rev-parse', '--show-toplevel'], { cwd, timeoutMs: 5_000 }).catch(() => ({ code: -1, stdout: '' }))
      let docker = { cli: commands['docker.exe'] !== null, daemon: false }
      if (docker.cli) {
        const info = await runProcess('docker.exe', ['info', '--format', '{{json .ServerVersion}}'], { cwd, timeoutMs: 10_000 }).catch(error => ({ code: -1, stderr: String(error) }))
        docker = { cli: true, daemon: info.code === 0, evidence: (info.stdout || info.stderr || '').trim().slice(0, 1_000) }
      }
      return { cwd, gitRoot: gitRoot.code === 0 ? gitRoot.stdout.trim() : null, commands, docker }
    },
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
        acceptance_files: {
          type: 'array',
          maxItems: 16,
          description: 'For a non-Git greenfield directory only: gate-owned verifier files under .halo-acceptance. The planner writes these before the worker runs; they are protected and never promoted.',
          items: {
            type: 'object', additionalProperties: false, required: ['path', 'content'],
            properties: { path: { type: 'string' }, content: { type: 'string' } },
          },
        },
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
      // Capture the caller's explicit policy before the first await, as DSH's
      // native delegation does. Staging is a working directory, not a sandbox.
      const sandboxMode = parent.ctx?.get?.('sandboxPolicy')?.overrideOf(parent.session)
      const repo = parent.session.header.cwd
      const result = await runGatedUnit({
        repo,
        runRoot,
        editablePaths: args.editable_paths,
        protectedPaths: args.protected_paths,
        verifyExecutable: args.verify_executable,
        verifyArgs: args.verify_args,
        acceptanceFiles: args.acceptance_files,
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
              if (sandboxMode !== undefined) {
                agentCtx.agent.session.append('sandbox/mode', { mode: sandboxMode, source: 'delegation' })
              }
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
      return result
    },
  })
}
