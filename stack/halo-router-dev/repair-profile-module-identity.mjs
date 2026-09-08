import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { lstat, mkdir, readFile, readdir, realpath, rename, rmdir, symlink } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'

const devRoot = path.dirname(fileURLToPath(import.meta.url))
const profileRoot = path.join(devRoot, 'home', 'profiles', 'web')
const profileModules = path.join(profileRoot, 'node_modules')
const profileTools = path.join(profileModules, '@deepseek-ai', 'dsh-tools')
const backupTools = path.join(profileModules, '@deepseek-ai', 'dsh-tools.halo-dev-original')
const dshPackage = path.join(devRoot, 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
const execFileAsync = promisify(execFile)

const exists = async target => {
  try {
    await lstat(target)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

const manifestAt = async packageFile => JSON.parse(await readFile(packageFile, 'utf8'))

async function resolveTopology() {
  const dshRequire = createRequire(await realpath(dshPackage))
  const basePackage = dshRequire.resolve('@deepseek-ai/dsh-base/package.json')
  const baseRequire = createRequire(basePackage)
  const loopPackage = baseRequire.resolve('@deepseek-ai/dsh-agent-loop/package.json')
  const loopRequire = createRequire(loopPackage)
  const canonicalToolsPackage = loopRequire.resolve('@deepseek-ai/dsh-tools/package.json')
  const canonicalTools = path.dirname(canonicalToolsPackage)
  const canonicalEntry = loopRequire.resolve('@deepseek-ai/dsh-tools')

  const profileRequire = createRequire(path.join(profileRoot, 'package.json'))
  const profileEntry = profileRequire.resolve('@deepseek-ai/dsh-tools')
  const profileResolvedPackage = profileRequire.resolve('@deepseek-ai/dsh-tools/package.json')
  const [canonicalReal, profileReal, canonicalManifest, profileManifest] = await Promise.all([
    realpath(canonicalTools),
    realpath(path.dirname(profileResolvedPackage)),
    manifestAt(canonicalToolsPackage),
    manifestAt(profileResolvedPackage),
  ])

  if (canonicalManifest.name !== '@deepseek-ai/dsh-tools' || profileManifest.name !== canonicalManifest.name) {
    throw new Error('refusing repair: resolved package identity is not @deepseek-ai/dsh-tools')
  }
  if (profileManifest.version !== canonicalManifest.version) {
    throw new Error(`refusing repair: profile tools ${profileManifest.version} differs from installed tools ${canonicalManifest.version}`)
  }

  const [canonicalModule, profileModule] = await Promise.all([
    import(pathToFileURL(canonicalEntry).href),
    import(pathToFileURL(profileEntry).href),
  ])

  return {
    basePackage,
    loopPackage,
    canonicalTools,
    canonicalReal,
    canonicalEntry,
    profileTools,
    profileReal,
    profileEntry,
    version: canonicalManifest.version,
    schedulerSymbolEqual: canonicalModule.TOOL_RUNTIME_SCHEDULER === profileModule.TOOL_RUNTIME_SCHEDULER,
  }
}

async function packageContainsLocalSymbol(packageDir) {
  const lib = path.join(packageDir, 'lib')
  if (!(await exists(lib))) return false
  const pending = [lib]
  while (pending.length > 0) {
    const dir = pending.pop()
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name)
      if (entry.isDirectory()) pending.push(target)
      else if (entry.isFile() && entry.name.endsWith('.js') && /\bSymbol\s*\(/u.test(await readFile(target, 'utf8'))) return true
    }
  }
  return false
}

async function findOtherProfileDuplicates() {
  const scope = path.join(profileModules, '@deepseek-ai')
  if (!(await exists(scope))) return []
  const dshRequire = createRequire(await realpath(dshPackage))
  const basePackage = dshRequire.resolve('@deepseek-ai/dsh-base/package.json')
  const baseRequire = createRequire(basePackage)
  const duplicates = []
  for (const entry of await readdir(scope, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'dsh-tools' || entry.name === 'dsh-tools.halo-dev-original') continue
    const packageName = `@deepseek-ai/${entry.name}`
    let installedPackage
    for (const resolver of [baseRequire, dshRequire]) {
      try {
        installedPackage = resolver.resolve(`${packageName}/package.json`)
        break
      } catch {}
    }
    if (!installedPackage) continue
    const localDir = path.join(scope, entry.name)
    const [localReal, installedReal] = await Promise.all([realpath(localDir), realpath(path.dirname(installedPackage))])
    if (localReal === installedReal) continue
    duplicates.push({
      packageName,
      profileReal: localReal,
      installedReal,
      containsModuleLocalSymbol: await packageContainsLocalSymbol(localDir),
    })
  }
  return duplicates
}

async function removeValidatedCanonicalJunction(topology) {
  const stat = await lstat(profileTools)
  if (!stat.isSymbolicLink()) throw new Error(`refusing removal: ${profileTools} is not a junction or symbolic link`)
  if ((await realpath(profileTools)) !== topology.canonicalReal) throw new Error(`refusing removal: ${profileTools} does not point to installed tools`)
  await rmdir(profileTools)
}

async function repair() {
  const before = await probeFresh()
  if (before.profileReal === before.canonicalReal && before.schedulerSymbolEqual) return { changed: false, before, after: before }
  if (await exists(backupTools)) throw new Error(`refusing repair: rollback path already exists: ${backupTools}`)

  await mkdir(path.dirname(profileTools), { recursive: true })
  await rename(profileTools, backupTools)
  let linked = false
  try {
    await symlink(before.canonicalReal, profileTools, 'junction')
    linked = true
    const after = await probeFresh()
    if (after.profileReal !== after.canonicalReal || !after.schedulerSymbolEqual) throw new Error('repair did not unify the scheduler symbol')
    return { changed: true, backupTools, before, after }
  } catch (error) {
    if (linked) {
      await removeValidatedCanonicalJunction(before)
    }
    await rename(backupTools, profileTools)
    throw error
  }
}

async function restore() {
  if (!(await exists(backupTools))) throw new Error(`no rollback package exists at ${backupTools}`)
  const before = await probeFresh()
  await removeValidatedCanonicalJunction(before)
  try {
    await rename(backupTools, profileTools)
  } catch (error) {
    await symlink(before.canonicalReal, profileTools, 'junction')
    throw error
  }
  return { changed: true, before, after: await probeFresh() }
}

async function probeFresh() {
  const { stdout } = await execFileAsync(process.execPath, [fileURLToPath(import.meta.url), '--probe'], {
    encoding: 'utf8',
    timeout: 30_000,
    windowsHide: true,
  })
  return JSON.parse(stdout)
}

async function main(argv) {
  const mode = argv[0] ?? '--check'
  if (mode === '--probe' && argv.length === 1) {
    process.stdout.write(`${JSON.stringify(await resolveTopology())}\n`)
    return
  }
  if (!['--check', '--repair', '--restore'].includes(mode) || argv.length > 1) {
    throw new Error('usage: node repair-profile-module-identity.mjs [--check|--repair|--restore]')
  }
  const result = mode === '--repair'
    ? await repair()
    : mode === '--restore'
      ? await restore()
      : { changed: false, topology: await probeFresh() }
  const otherProfileDuplicates = await findOtherProfileDuplicates()
  result.otherProfileDuplicateCount = otherProfileDuplicates.length
  result.otherProfileSymbolDuplicates = otherProfileDuplicates.filter(item => item.containsModuleLocalSymbol)
  result.checkedAt = new Date().toISOString()
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  const topology = result.after ?? result.topology
  if (mode === '--check' && (topology.profileReal !== topology.canonicalReal || !topology.schedulerSymbolEqual)) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${error.stack ?? error}\n`)
    process.exitCode = 1
  })
}
