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
  const listeners = new Map()
  const ctx = {
    on(name, callback) { listeners.set(name, callback) },
    tools: { register(tool) { registered = tool; return () => {} } },
    agents: {
      async create(options) {
        setupOptions = options
        const events = []
        const agent = { session: { id: options.sessionId, header: { cwd: options.meta.cwd }, append(type, value) { events.push({ type, value }) } } }
        options.setup({ agent })
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
  const cockpit = { session: { id: 'cockpit', header: { cwd: repo } } }
  try {
    const result = await registered.execute({
      description: 'fixture change', prompt: 'fix it', editable_paths: ['src'], protected_paths: ['tests'],
      verify_executable: process.execPath, verify_args: ['tests/verify.mjs'],
    }, { agent: cockpit, signal: new AbortController().signal })
    assert.equal(result.status, 'PASS', JSON.stringify(result))
    assert.notEqual(setupOptions.meta.cwd, repo)
    assert.equal(spawnRequest.parent.session.header.cwd, setupOptions.meta.cwd)
    assert.deepEqual(spawnRequest.parent.events, [{ type: 'sandbox/mode', value: { mode: 'workspace-write' } }])
    assert.equal(spawnRequest.agentOptions.model, 'halo/qwen3-coder-30b-a3b')
    assert.equal(spawnRequest.maxDepth, 0)
    assert.equal(await readFile(join(repo, 'src', 'value.txt'), 'utf8'), 'good\n')
    const decision = await listeners.get('tools/pre-execute')({ name: 'update_goal', arguments: { action: 'complete' }, agent: cockpit }, async () => ({ kind: 'allow' }))
    assert.deepEqual(decision, { kind: 'allow' })
  } finally {
    await rm(repo, { recursive: true, force: true })
    await rm(runRoot, { recursive: true, force: true })
  }
})
