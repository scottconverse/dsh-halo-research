import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { cp, lstat, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

const SKIP_DIRS = new Set(['.git', 'node_modules', '.halo-gate', '.halo-scratch', '.halo-acceptance', '__pycache__', '.pytest_cache'])

export function normalizeRelativePath(value) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('paths must be non-empty strings')
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '')
  if (isAbsolute(value) || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error(`path escapes the workspace: ${value}`)
  }
  return normalized
}

export function isWithin(path, roots) {
  const p = normalizeRelativePath(path)
  return roots.some((root) => p === root || p.startsWith(`${root}/`))
}

export async function runProcess(executable, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 120_000
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout = []
    const stderr = []
    child.stdout.on('data', chunk => stdout.push(chunk))
    child.stderr.on('data', chunk => stderr.push(chunk))
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
    }, timeoutMs)
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolvePromise({
        code: code ?? -1,
        signal,
        timedOut,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      })
    })
  })
}

async function git(cwd, args, timeoutMs = 120_000) {
  const result = await runProcess('git.exe', args, { cwd, timeoutMs })
  if (result.code !== 0) throw new Error(`git ${args.join(' ')} failed (${result.code}): ${result.stderr || result.stdout}`)
  return result.stdout
}

async function discoverGitRoot(cwd) {
  const result = await runProcess('git.exe', ['rev-parse', '--show-toplevel'], { cwd, timeoutMs: 30_000 })
  return result.code === 0 ? result.stdout.trim() : undefined
}

async function hashFile(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

async function walk(root, current = root, output = []) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue
    const absolute = join(current, entry.name)
    if (entry.isDirectory()) await walk(root, absolute, output)
    else if (entry.isFile()) output.push(relative(root, absolute).split(sep).join('/'))
  }
  return output
}

export async function snapshotTree(root) {
  const result = new Map()
  for (const path of await walk(root)) result.set(path, await hashFile(join(root, path)))
  return result
}

export function changedPaths(before, after) {
  const changed = new Set()
  for (const [path, hash] of before) if (after.get(path) !== hash) changed.add(path)
  for (const path of after.keys()) if (!before.has(path)) changed.add(path)
  return [...changed].sort()
}

async function snapshotSelected(root, roots) {
  const all = await snapshotTree(root)
  return new Map([...all].filter(([path]) => isWithin(path, roots)))
}

async function copyOne(sourceRoot, targetRoot, path) {
  const source = join(sourceRoot, path)
  const target = join(targetRoot, path)
  try {
    const info = await stat(source)
    if (!info.isFile()) throw new Error(`only files may be promoted: ${path}`)
    await mkdir(dirname(target), { recursive: true })
    await cp(source, target, { force: true })
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    await rm(target, { force: true })
  }
}

async function copyUntracked(sourceRoot, targetRoot) {
  const raw = await git(sourceRoot, ['ls-files', '--others', '--exclude-standard', '-z'])
  for (const path of raw.split('\0').filter(Boolean)) await copyOne(sourceRoot, targetRoot, path)
}

async function overlayWorkingTree(sourceRoot, targetRoot) {
  const raw = await git(sourceRoot, ['ls-files', '-m', '-d', '-z'])
  for (const path of raw.split('\0').filter(Boolean)) await copyOne(sourceRoot, targetRoot, path)
  await copyUntracked(sourceRoot, targetRoot)
  for (const dependency of ['node_modules', '.venv', 'venv']) {
    const source = join(sourceRoot, dependency)
    const target = join(targetRoot, dependency)
    try {
      if ((await lstat(source)).isDirectory()) await symlink(source, target, 'junction')
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'EEXIST') throw error
    }
  }
}

async function createWorktree(repo, path) {
  await mkdir(dirname(path), { recursive: true })
  await git(repo, ['worktree', 'add', '--detach', path, 'HEAD'])
  await overlayWorkingTree(repo, path)
}

async function createGreenfieldSeed(source, seed, acceptanceFiles) {
  if (!Array.isArray(acceptanceFiles) || acceptanceFiles.length === 0) {
    throw new Error('greenfield workspaces require gate-owned acceptance_files')
  }
  if (acceptanceFiles.length > 16) throw new Error('acceptance_files may contain at most 16 files')
  await mkdir(seed, { recursive: true })
  for (const path of await walk(source)) await copyOne(source, seed, path)
  for (const item of acceptanceFiles) {
    const path = normalizeRelativePath(item?.path)
    if (!isWithin(path, ['.halo-acceptance'])) {
      throw new Error(`acceptance file must be under .halo-acceptance: ${path}`)
    }
    if (typeof item?.content !== 'string' || Buffer.byteLength(item.content, 'utf8') > 65_536) {
      throw new Error(`acceptance file content is invalid or too large: ${path}`)
    }
    const target = join(seed, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, item.content)
  }
  for (const args of [
    ['init'],
    ['config', 'user.email', 'halo-gate@example.invalid'],
    ['config', 'user.name', 'Halo Gate'],
    ['add', '.'],
    ['commit', '-m', 'gate-owned greenfield baseline'],
  ]) await git(seed, args)
}

async function removeWorktree(repo, path) {
  await runProcess('git.exe', ['worktree', 'remove', '--force', path], { cwd: repo, timeoutMs: 30_000 })
  await rm(path, { recursive: true, force: true })
}

function assertPolicy(editable, protectedPaths) {
  if (editable.length === 0) throw new Error('editable_paths must contain at least one path')
  if (protectedPaths.length === 0) throw new Error('protected_paths must contain at least one real test or verifier path')
  for (const protectedPath of protectedPaths) {
    if (isWithin(protectedPath, editable) || editable.some(path => isWithin(path, [protectedPath]))) {
      throw new Error(`editable and protected paths overlap: ${protectedPath}`)
    }
  }
}

function boundedEvidence(result) {
  return `${result.stdout}${result.stderr}`.slice(-12_000)
}

async function verify(cwd, command, args, timeoutMs) {
  try {
    const result = await runProcess(command, args, { cwd, timeoutMs })
    if (result.timedOut) return { pass: false, reason: 'VERIFIER_TIMEOUT', evidence: boundedEvidence(result) }
    if (result.code !== 0) return { pass: false, reason: 'VERIFIER_FAILED', evidence: boundedEvidence(result) }
    return { pass: true, reason: 'PASS', evidence: boundedEvidence(result) }
  } catch (error) {
    return { pass: false, reason: 'VERIFIER_CRASHED', evidence: String(error) }
  }
}

async function restoreBackup(repo, backupRoot, changed, existed) {
  for (const path of changed) {
    if (existed.has(path)) await copyOne(backupRoot, repo, path)
    else await rm(join(repo, path), { force: true })
  }
}

export async function runGatedUnit(options) {
  const repo = resolve(options.repo)
  const editable = options.editablePaths.map(normalizeRelativePath)
  const protectedPaths = options.protectedPaths.map(normalizeRelativePath)
  assertPolicy(editable, protectedPaths)
  const id = `${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`
  const root = join(options.runRoot, id)
  const seed = join(root, 'greenfield-baseline')
  const stage = join(root, 'stage')
  const scratch = join(stage, '.halo-scratch')
  const verification = join(root, 'verification')
  const backup = join(root, 'promotion-backup')
  const auditPath = join(root, 'verdict.json')
  const audit = { id, startedAt: new Date().toISOString(), repo, editable, protectedPaths, rounds: [], state: 'STARTED' }
  await mkdir(root, { recursive: true })
  let stageCreated = false
  let verificationCreated = false
  try {
    const discoveredRoot = await discoverGitRoot(repo)
    let workingRepo = repo
    if (discoveredRoot === undefined) {
      await createGreenfieldSeed(repo, seed, options.acceptanceFiles)
      workingRepo = seed
      audit.workspaceMode = 'greenfield'
    } else {
      if (resolve(discoveredRoot).toLowerCase() !== repo.toLowerCase()) throw new Error(`workspace must be repository root: ${discoveredRoot}`)
      if (options.acceptanceFiles?.length) throw new Error('acceptance_files are reserved for non-Git greenfield workspaces')
      audit.workspaceMode = 'git'
    }
    for (const path of protectedPaths) await stat(join(workingRepo, path))
    const liveBefore = await snapshotSelected(repo, editable)
    await createWorktree(workingRepo, stage)
    stageCreated = true
    await mkdir(scratch, { recursive: true })
    const stageBefore = await snapshotTree(stage)
    const protectedBefore = await snapshotSelected(stage, protectedPaths)

    let workerText = ''
    let lastFailure = ''
    let acceptedChanges = []
    for (let round = 1; round <= 2; round += 1) {
      try {
        workerText = await options.runWorker({ stage, scratch, round, feedback: lastFailure })
      } catch (error) {
        audit.rounds.push({ round, state: 'WORKER_FAILED', evidence: String(error) })
        lastFailure = `Worker failed: ${String(error)}`
        continue
      }
      const after = await snapshotTree(stage)
      const changes = changedPaths(stageBefore, after)
      const protectedAfter = await snapshotSelected(stage, protectedPaths)
      const protectedChanged = changedPaths(protectedBefore, protectedAfter)
      const outside = changes.filter(path => !isWithin(path, editable) && !isWithin(path, protectedPaths))
      if (protectedChanged.length || outside.length) {
        const reason = protectedChanged.length
          ? `PROTECTED_PATH_CHANGED: ${protectedChanged.join(', ')}`
          : `OUT_OF_SCOPE_CHANGE: ${outside.join(', ')}`
        audit.rounds.push({ round, state: 'POLICY_FAILED', reason, workerText })
        lastFailure = reason
        continue
      }
      acceptedChanges = changes.filter(path => isWithin(path, editable))
      if (acceptedChanges.length === 0) {
        lastFailure = 'NO_IMPLEMENTATION_CHANGES'
        audit.rounds.push({ round, state: 'POLICY_FAILED', reason: lastFailure, workerText })
        continue
      }

      if (verificationCreated) await removeWorktree(workingRepo, verification)
      await createWorktree(workingRepo, verification)
      verificationCreated = true
      for (const path of acceptedChanges) await copyOne(stage, verification, path)
      for (const path of protectedBefore.keys()) await copyOne(workingRepo, verification, path)
      const result = await verify(verification, options.verifyExecutable, options.verifyArgs, options.verifyTimeoutMs)
      audit.rounds.push({ round, state: result.pass ? 'VERIFIED' : result.reason, changes: acceptedChanges, evidence: result.evidence, workerText })
      if (result.pass) {
        lastFailure = ''
        break
      }
      lastFailure = `${result.reason}\n${result.evidence}`
    }

    const passedRound = audit.rounds.findLast(item => item.state === 'VERIFIED')
    if (!passedRound) {
      audit.state = 'FAILED'
      audit.finishedAt = new Date().toISOString()
      await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`)
      return { status: 'FAILED', auditPath, evidence: lastFailure || 'worker did not produce a verified result' }
    }

    const liveNow = await snapshotSelected(repo, editable)
    if (changedPaths(liveBefore, liveNow).length) {
      audit.state = 'PROMOTION_REFUSED_CONCURRENT_CHANGE'
      audit.finishedAt = new Date().toISOString()
      await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`)
      return { status: audit.state, auditPath, evidence: 'editable paths changed in the live workspace while the worker ran' }
    }

    await mkdir(backup, { recursive: true })
    const existed = new Set()
    for (const path of acceptedChanges) {
      try {
        await stat(join(repo, path))
        existed.add(path)
        await copyOne(repo, backup, path)
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error
      }
      await copyOne(stage, repo, path)
    }
    let post
    if (audit.workspaceMode === 'greenfield') {
      await removeWorktree(workingRepo, verification)
      verificationCreated = false
      await createWorktree(workingRepo, verification)
      verificationCreated = true
      for (const path of acceptedChanges) await copyOne(repo, verification, path)
      for (const path of protectedBefore.keys()) await copyOne(workingRepo, verification, path)
      post = await verify(verification, options.verifyExecutable, options.verifyArgs, options.verifyTimeoutMs)
    } else {
      post = await verify(repo, options.verifyExecutable, options.verifyArgs, options.verifyTimeoutMs)
    }
    audit.postPromotion = post
    if (!post.pass) {
      await restoreBackup(repo, backup, acceptedChanges, existed)
      audit.state = 'PROMOTION_FAILED_ROLLED_BACK'
    } else {
      audit.state = 'PASS'
    }
    audit.finishedAt = new Date().toISOString()
    audit.changes = acceptedChanges
    await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`)
    return { status: audit.state, auditPath, evidence: post.evidence, changes: acceptedChanges, workerText }
  } catch (error) {
    audit.state = 'GATE_CRASHED'
    audit.error = String(error)
    audit.finishedAt = new Date().toISOString()
    await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`).catch(() => {})
    return { status: 'GATE_CRASHED', auditPath, evidence: String(error) }
  } finally {
    const cleanupRepo = audit.workspaceMode === 'greenfield' ? seed : repo
    if (verificationCreated) await removeWorktree(cleanupRepo, verification).catch(() => {})
    if (stageCreated) await removeWorktree(cleanupRepo, stage).catch(() => {})
  }
}
