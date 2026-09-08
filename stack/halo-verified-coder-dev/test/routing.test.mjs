import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { apply } from '../index.mjs'
import { runProcess } from '../gate-core.mjs'

async function fixtureRepo() {
  const root = await mkdtemp(join(tmpdir(), 'halo-dev-routing-'))
  await mkdir(join(root, 'src'))
  await mkdir(join(root, 'tests'))
  await writeFile(join(root, 'src', 'value.txt'), 'bad\n')
  await writeFile(join(root, 'tests', 'verify.mjs'), "import fs from 'node:fs'; if (fs.readFileSync('src/value.txt','utf8').trim() !== 'good') process.exit(7)\n")
  for (const args of [['init'], ['config', 'user.email', 'halo@example.invalid'], ['config', 'user.name', 'Halo'], ['add', '.'], ['commit', '-m', 'fixture']]) {
    assert.equal((await runProcess('git.exe', args, { cwd: root })).code, 0)
  }
  return root
}

async function runRoutedGate(resolve) {
  const repo = await fixtureRepo()
  const runRoot = join(repo, '..', `halo-dev-routing-runs-${Date.now()}`)
  const registered = []
  const resolveCalls = []
  const bindings = []
  let spawnProvider
  let spawnRequest
  const ctx = {
    haloRouting: {
      async resolve(input) {
        resolveCalls.push(input)
        return await resolve(input)
      },
      async bindWorkerDecision(decisionId, workerSessionId) { bindings.push({ decisionId, workerSessionId }) },
    },
    tools: { register(tool) { registered.push(tool); return () => {} } },
    agents: {
      async create(options) {
        const agent = { id: options.sessionId, ctx: {}, session: { id: options.sessionId, header: { cwd: options.meta.cwd }, append() {} } }
        options.setup({ agent, get() { return { composeFrom() {} } } })
        return { agent, async dispose() {} }
      },
    },
    subagents: {
      async start(provider, request) {
        spawnProvider = provider
        spawnRequest = request
        await writeFile(join(request.parent.session.header.cwd, 'src', 'value.txt'), 'good\n')
        return {
          id: 'actual-worker-session',
          result: Promise.resolve({ stopReason: 'completed', output: [{ type: 'text', text: 'worker done' }] }),
          async dispose() {},
        }
      },
    },
    emit() {},
  }
  const routingService=ctx.haloRouting
  ctx.get=name=>name==='haloRouting'?routingService:undefined
  Object.defineProperty(ctx,'haloRouting',{get(){throw Error('cannot get property "haloRouting" without inject')}})
  apply(ctx, { routing: true, runRoot, verifyTimeoutMs: 5_000 })
  const tool = registered.find(item => item.name === 'subagent_coder')
  const cockpitCtx = { get() {} }
  const cockpit = { ctx: cockpitCtx, session: { id: 'human-session', header: { cwd: repo } } }
  try {
    const result = await tool.execute({
      description: 'fixture change', prompt: 'fix it', editable_paths: ['src'], protected_paths: ['tests'],
      verify_executable: process.execPath, verify_args: ['tests/verify.mjs'],
    }, { agent: cockpit, signal: new AbortController().signal })
    return { repo, result, resolveCalls, bindings, spawnProvider, spawnRequest }
  } finally {
    await rm(repo, { recursive: true, force: true })
    await rm(runRoot, { recursive: true, force: true })
  }
}

test('opt-in routing resolves before each worker and explicitly applies the selected model', async () => {
  const observed = await runRoutedGate(async () => ({
    provider: 'routed-provider', model: 'routed-model', reasoningEffort: 'high',
    decisionId: 'decision-1', reason: 'qualified structured writer',
  }))
  assert.equal(observed.result.status, 'PASS')
  assert.equal(observed.resolveCalls.length, 1)
  assert.equal(observed.resolveCalls[0].sessionId, 'human-session')
  assert.equal(observed.resolveCalls[0].role, 'structured_write')
  assert.match(observed.resolveCalls[0].executionSessionId, /^halo-gate-/)
  assert.equal(observed.spawnProvider, 'spawn', 'routing must not replace the subagent transport')
  assert.deepEqual(observed.spawnRequest.agentOptions, {
    provider: 'routed-provider', model: 'routed-model', reasoningEffort: 'high', maxTokens: 8192,
  })
  assert.deepEqual(observed.bindings, [{ decisionId: 'decision-1', workerSessionId: 'actual-worker-session' }])
})

test('routing failure falls back to the original explicit worker selection', async () => {
  let observed
  let caught
  try {
    observed = await runRoutedGate(async () => { throw new Error('router unavailable') })
  } catch (error) {
    caught = error
  }
  assert.equal(caught, undefined, 'router failure must not prevent the verified worker from running')
  assert.equal(observed.result.status, 'PASS')
  assert.deepEqual(observed.spawnRequest.agentOptions, {
    provider: 'lmstudio', model: 'halo/qwen3-coder-30b-a3b-q4km', maxTokens: 8192,
  })
  assert.deepEqual(observed.bindings, [])
})

test('local-only refusal prevents the worker instead of bypassing the operator constraint', async () => {
  const observed = await runRoutedGate(async () => {
    const error = new Error('no eligible local worker')
    error.code = 'HALO_LOCAL_ONLY'
    throw error
  })
  assert.equal(observed.result.status, 'FAILED')
  assert.equal(observed.spawnRequest, undefined)
})
