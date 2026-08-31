import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { changedPaths, isWithin, normalizeRelativePath, runGatedUnit, runProcess, snapshotTree } from '../gate-core.mjs'

async function fixtureRepo() {
  const root = await mkdtemp(join(tmpdir(), 'halo-gate-repo-'))
  await mkdir(join(root, 'src'))
  await mkdir(join(root, 'tests'))
  await writeFile(join(root, 'src', 'value.txt'), 'bad\n')
  await writeFile(join(root, 'tests', 'verify.mjs'), "import fs from 'node:fs'; if (fs.readFileSync('src/value.txt','utf8').trim() !== 'good') process.exit(9)\n")
  assert.equal((await runProcess('git.exe', ['init'], { cwd: root })).code, 0)
  assert.equal((await runProcess('git.exe', ['config', 'user.email', 'halo@example.invalid'], { cwd: root })).code, 0)
  assert.equal((await runProcess('git.exe', ['config', 'user.name', 'Halo Gate'], { cwd: root })).code, 0)
  assert.equal((await runProcess('git.exe', ['add', '.'], { cwd: root })).code, 0)
  assert.equal((await runProcess('git.exe', ['commit', '-m', 'fixture'], { cwd: root })).code, 0)
  return root
}

test('path policy rejects traversal and recognizes directory boundaries', () => {
  assert.throws(() => normalizeRelativePath('../escape'), /escapes/)
  assert.equal(isWithin('src/a.js', ['src']), true)
  assert.equal(isWithin('src2/a.js', ['src']), false)
})

test('tree snapshots detect edits, deletions, and additions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'halo-gate-snapshot-'))
  try {
    await mkdir(join(root, 'src'))
    await writeFile(join(root, 'src', 'a.txt'), 'before')
    await writeFile(join(root, 'src', 'gone.txt'), 'gone')
    const before = await snapshotTree(root)
    await writeFile(join(root, 'src', 'a.txt'), 'after')
    await rm(join(root, 'src', 'gone.txt'))
    await writeFile(join(root, 'src', 'new.txt'), 'new')
    const after = await snapshotTree(root)
    assert.deepEqual(changedPaths(before, after), ['src/a.txt', 'src/gone.txt', 'src/new.txt'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('process runner preserves stdout and stderr separately', async () => {
  const result = await runProcess(process.execPath, ['-e', "console.log('OUT'); console.error('ERR')"])
  assert.equal(result.code, 0)
  assert.match(result.stdout, /OUT/)
  assert.match(result.stderr, /ERR/)
})

test('process timeout is fail-closed', async () => {
  const result = await runProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 50 })
  assert.equal(result.timedOut, true)
  assert.notEqual(result.code, 0)
})

test('honest worker verifies and promotes', async () => {
  const repo = await fixtureRepo()
  try {
    const result = await runGatedUnit({
      repo,
      runRoot: join(repo, '..', 'halo-gate-runs'),
      editablePaths: ['src'],
      protectedPaths: ['tests'],
      verifyExecutable: process.execPath,
      verifyArgs: ['tests/verify.mjs'],
      verifyTimeoutMs: 5_000,
      async runWorker({ stage }) { await writeFile(join(stage, 'src', 'value.txt'), 'good\n'); return 'done' },
    })
    assert.equal(result.status, 'PASS', JSON.stringify(result))
    assert.equal(await readFile(join(repo, 'src', 'value.txt'), 'utf8'), 'good\n')
  } finally {
    await rm(repo, { recursive: true, force: true })
    await rm(join(repo, '..', 'halo-gate-runs'), { recursive: true, force: true })
  }
})

test('gate-owned scratch files are ignored and never promoted', async () => {
  const repo = await fixtureRepo()
  try {
    const result = await runGatedUnit({
      repo,
      runRoot: join(repo, '..', 'halo-gate-runs'),
      editablePaths: ['src'],
      protectedPaths: ['tests'],
      verifyExecutable: process.execPath,
      verifyArgs: ['tests/verify.mjs'],
      verifyTimeoutMs: 5_000,
      async runWorker({ stage, scratch }) {
        assert.equal(scratch, join(stage, '.halo-scratch'))
        await writeFile(join(stage, 'src', 'value.txt'), 'good\n')
        await writeFile(join(scratch, 'manual-fixture.txt'), 'temporary\n')
        return 'done'
      },
    })
    assert.equal(result.status, 'PASS', JSON.stringify(result))
    assert.equal(await readFile(join(repo, 'src', 'value.txt'), 'utf8'), 'good\n')
    await assert.rejects(readFile(join(repo, '.halo-scratch', 'manual-fixture.txt')), { code: 'ENOENT' })
  } finally {
    await rm(repo, { recursive: true, force: true })
    await rm(join(repo, '..', 'halo-gate-runs'), { recursive: true, force: true })
  }
})

test('protected-test rewrite is caught and never promoted', async () => {
  const repo = await fixtureRepo()
  try {
    const result = await runGatedUnit({
      repo,
      runRoot: join(repo, '..', 'halo-gate-runs'),
      editablePaths: ['src'],
      protectedPaths: ['tests'],
      verifyExecutable: process.execPath,
      verifyArgs: ['tests/verify.mjs'],
      verifyTimeoutMs: 5_000,
      async runWorker({ stage }) {
        await writeFile(join(stage, 'src', 'value.txt'), 'good\n')
        await writeFile(join(stage, 'tests', 'verify.mjs'), 'process.exit(0)\n')
        return 'claimed success'
      },
    })
    assert.equal(result.status, 'FAILED', JSON.stringify(result))
    assert.equal(await readFile(join(repo, 'src', 'value.txt'), 'utf8'), 'bad\n')
  } finally {
    await rm(repo, { recursive: true, force: true })
    await rm(join(repo, '..', 'halo-gate-runs'), { recursive: true, force: true })
  }
})

test('verifier launch crash is a failure, never a pass', async () => {
  const repo = await fixtureRepo()
  try {
    const result = await runGatedUnit({
      repo,
      runRoot: join(repo, '..', 'halo-gate-runs'),
      editablePaths: ['src'],
      protectedPaths: ['tests'],
      verifyExecutable: 'definitely-not-a-real-verifier.exe',
      verifyArgs: [],
      verifyTimeoutMs: 500,
      async runWorker({ stage }) { await writeFile(join(stage, 'src', 'value.txt'), 'good\n'); return 'claimed success' },
    })
    assert.equal(result.status, 'FAILED', JSON.stringify(result))
    assert.equal(await readFile(join(repo, 'src', 'value.txt'), 'utf8'), 'bad\n')
  } finally {
    await rm(repo, { recursive: true, force: true })
    await rm(join(repo, '..', 'halo-gate-runs'), { recursive: true, force: true })
  }
})

test('greenfield workspace uses gate-owned acceptance files and promotes only implementation files', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'halo-greenfield-'))
  const runRoot = join(workspace, '..', `halo-greenfield-runs-${Date.now()}`)
  try {
    const result = await runGatedUnit({
      repo: workspace,
      runRoot,
      editablePaths: ['src', 'README.md'],
      protectedPaths: ['.halo-acceptance/verify.mjs'],
      acceptanceFiles: [{
        path: '.halo-acceptance/verify.mjs',
        content: "import fs from 'node:fs'; if (fs.readFileSync('src/value.txt','utf8').trim() !== 'good') process.exit(11)\n",
      }],
      verifyExecutable: process.execPath,
      verifyArgs: ['.halo-acceptance/verify.mjs'],
      verifyTimeoutMs: 5_000,
      async runWorker({ stage }) {
        await mkdir(join(stage, 'src'), { recursive: true })
        await writeFile(join(stage, 'src', 'value.txt'), 'good\n')
        await writeFile(join(stage, 'README.md'), 'greenfield\n')
        return 'done'
      },
    })
    assert.equal(result.status, 'PASS', JSON.stringify(result))
    assert.equal(await readFile(join(workspace, 'src', 'value.txt'), 'utf8'), 'good\n')
    assert.equal(await readFile(join(workspace, 'README.md'), 'utf8'), 'greenfield\n')
    await assert.rejects(readFile(join(workspace, '.halo-acceptance', 'verify.mjs')), { code: 'ENOENT' })
  } finally {
    await rm(workspace, { recursive: true, force: true })
    await rm(runRoot, { recursive: true, force: true })
  }
})

test('greenfield worker cannot rewrite gate-owned acceptance files', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'halo-greenfield-cheat-'))
  const runRoot = join(workspace, '..', `halo-greenfield-cheat-runs-${Date.now()}`)
  try {
    const result = await runGatedUnit({
      repo: workspace,
      runRoot,
      editablePaths: ['src'],
      protectedPaths: ['.halo-acceptance/verify.mjs'],
      acceptanceFiles: [{ path: '.halo-acceptance/verify.mjs', content: 'process.exit(9)\n' }],
      verifyExecutable: process.execPath,
      verifyArgs: ['.halo-acceptance/verify.mjs'],
      verifyTimeoutMs: 5_000,
      async runWorker({ stage }) {
        await mkdir(join(stage, 'src'), { recursive: true })
        await writeFile(join(stage, 'src', 'value.txt'), 'claimed\n')
        await writeFile(join(stage, '.halo-acceptance', 'verify.mjs'), 'process.exit(0)\n')
        return 'claimed success'
      },
    })
    assert.equal(result.status, 'FAILED', JSON.stringify(result))
    await assert.rejects(readFile(join(workspace, 'src', 'value.txt')), { code: 'ENOENT' })
  } finally {
    await rm(workspace, { recursive: true, force: true })
    await rm(runRoot, { recursive: true, force: true })
  }
})
