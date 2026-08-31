import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { apply } from '../index.mjs'
import { runProcess } from '../gate-core.mjs'

async function fixtureRepo() {
  const root = await mkdtemp(join(tmpdir(), 'halo-plugin-repo-'))
  await mkdir(join(root, 'src'))
  await mkdir(join(root, 'tests'))
  await writeFile(join(root, 'src', 'value.txt'), 'bad\n')
  await writeFile(join(root, 'tests', 'verify.mjs'), "import fs from 'node:fs'; if (fs.readFileSync('src/value.txt','utf8').trim() !== 'good') process.exit(7)\n")
  for (const args of [['init'], ['config', 'user.email', 'halo@example.invalid'], ['config', 'user.name', 'Halo'], ['add', '.'], ['commit', '-m', 'fixture']]) {
    assert.equal((await runProcess('git.exe', args, { cwd: root })).code, 0)
  }
  return root
}

test('DSH wrapper supplies a synthetic workspace-write parent to spawn', async () => {
  const repo = await fixtureRepo()
  const runRoot = join(repo, '..', `halo-plugin-runs-${Date.now()}`)
  let registered
  let setupOptions
  let spawnRequest
  let composedFrom
  const listeners = new Map()
  const ctx = {
    on(name, callback) { listeners.set(name, callback) },
    tools: { register(tool) { registered = tool; return () => {} } },
    agents: {
      async create(options) {
        setupOptions = options
        const events = []
        const agent = { session: { id: options.sessionId, header: { cwd: options.meta.cwd }, append(type, value) { events.push({ type, value }) } } }
        options.setup({
          agent,
          get(name) {
            if (name !== 'agentPresets') return undefined
            return { composeFrom(childCtx, parentCtx) { composedFrom = { childCtx, parentCtx } } }
          },
        })
        agent.events = events
        return { agent, async dispose() {} }
      },
    },
    subagents: {
      async start(_provider, request) {
        spawnRequest = request
        await writeFile(join(request.parent.session.header.cwd, 'src', 'value.txt'), 'good\n')
        return { result: Promise.resolve({ stopReason: 'completed', output: [{ type: 'text', text: 'worker done' }] }), async dispose() {} }
      },
    },
  }
  apply(ctx, { runRoot, verifyTimeoutMs: 5_000 })
  assert.equal(registered.name, 'subagent_coder')
  assert.equal(registered.parameters.type, 'object')
  assert.deepEqual(registered.parameters.required, [
    'description', 'prompt', 'editable_paths', 'protected_paths', 'verify_executable', 'verify_args',
  ])
  const cockpitCtx = {
    get(name) {
      if (name !== 'agentPresets') return undefined
      return { composedPreset(ctx) { assert.equal(ctx, cockpitCtx); return 'halo-orchestrator' } }
    },
  }
  const cockpit = { ctx: cockpitCtx, session: { id: 'cockpit', header: { cwd: repo } } }
  try {
    const result = await registered.execute({
      description: 'fixture change', prompt: 'fix it', editable_paths: ['src'], protected_paths: ['tests'],
      verify_executable: process.execPath, verify_args: ['tests/verify.mjs'],
    }, { agent: cockpit, signal: new AbortController().signal })
    assert.equal(result.status, 'PASS', JSON.stringify(result))
    assert.notEqual(setupOptions.meta.cwd, repo)
    assert.equal(setupOptions.meta.agentPreset, 'halo-orchestrator')
    assert.equal(composedFrom.parentCtx, cockpitCtx)
    assert.equal(spawnRequest.parent.session.header.cwd, setupOptions.meta.cwd)
    assert.deepEqual(spawnRequest.parent.events, [{ type: 'sandbox/mode', value: { mode: 'workspace-write' } }])
    assert.equal(spawnRequest.agentOptions.model, 'halo/qwen3-coder-30b-a3b-q4km')
    assert.equal(spawnRequest.maxDepth, 1)
    assert.deepEqual(spawnRequest.toolFilter, {
      allow: ['read', 'write', 'edit', 'glob', 'grep', 'pwsh'],
    })
    assert.match(spawnRequest.persona, /implementation worker/i)
    assert.match(spawnRequest.prompt[0].text, /\.halo-scratch/)
    assert.equal(await readFile(join(repo, 'src', 'value.txt'), 'utf8'), 'good\n')
    const decision = await listeners.get('tools/pre-execute')({ name: 'update_goal', arguments: { action: 'complete' }, agent: cockpit }, async () => ({ kind: 'allow' }))
    assert.deepEqual(decision, { kind: 'allow' })
    for (const name of ['subagent_coder', 'edit', 'write', 'pwsh']) {
      const blocked = await listeners.get('tools/pre-execute')({ name, arguments: {}, agent: cockpit }, async () => ({ kind: 'allow' }))
      assert.equal(blocked.kind, 'deny', `${name} should be locked after the gate verdict`)
    }
    const readOnly = await listeners.get('tools/pre-execute')({ name: 'read', arguments: {}, agent: cockpit }, async () => ({ kind: 'allow' }))
    assert.deepEqual(readOnly, { kind: 'allow' })
  } finally {
    await rm(repo, { recursive: true, force: true })
    await rm(runRoot, { recursive: true, force: true })
  }
})

test('planner cannot mutate directly and worker shell guard blocks runaway command shapes', async () => {
  const listeners = new Map()
  const ctx = {
    on(name, callback) { listeners.set(name, callback) },
    tools: { register() { return () => {} } },
    agents: {},
    subagents: {},
  }
  apply(ctx, { runRoot: 'C:\\HaloGate\\runs' })
  const policy = listeners.get('tools/pre-execute')
  const planner = { session: { header: { cwd: 'C:\\Users\\scott\\project' } } }
  const worker = { session: { header: { cwd: 'C:\\HaloGate\\runs\\one\\stage' } } }
  const allow = async () => ({ kind: 'allow' })
  for (const name of ['write', 'edit', 'pwsh', 'bash', 'subagent', 'subagent_codex', 'subagent_claude_build', 'workflow', 'ralph']) {
    const decision = await policy({ name, arguments: { command: 'Write-Output ok' }, agent: planner }, allow)
    assert.equal(decision.kind, 'deny', `${name} must be denied to the planner`)
  }
  const recurse = await policy({
    name: 'pwsh', arguments: { command: 'Get-ChildItem -Recurse' }, agent: worker,
  }, allow)
  assert.equal(recurse.kind, 'deny')
  const foregroundServer = await policy({
    name: 'pwsh', arguments: { command: 'npm run dev', run_in_background: false }, agent: worker,
  }, allow)
  assert.equal(foregroundServer.kind, 'deny')
  const backgroundServer = await policy({
    name: 'pwsh', arguments: { command: 'npm run dev', run_in_background: true }, agent: worker,
  }, allow)
  assert.deepEqual(backgroundServer, { kind: 'allow' })
})
