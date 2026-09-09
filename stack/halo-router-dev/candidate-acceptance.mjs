// Candidate model acceptance for the approved 2026-09-09 test plan. Manual
// routing on purpose: tests a model, not the router. Runs in DEV; needs the
// temporary acceptance driver mounted (see README "Reproduce acceptance").
// Not a benchmark.
import {enqueueAcceptanceRequest as run} from './acceptance-client.mjs'
import {createStructuredWriteFixture, STRUCTURED_WRITE_FIXTURE} from '../halo-routing/qualification.mjs'
import {execFileSync} from 'node:child_process'
import {mkdir, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const defaultHome = path.join(repoRoot, 'stack', 'halo-router-dev', 'home')
const sanitize = key => key.replace(/[^A-Za-z0-9._-]/g, '_')
const usage = 'usage: node candidate-acceptance.mjs <gate|research> --model <lmstudio model key> [--provider lmstudio] [--home <path>] [--label <text>]'

function parseArgs(argv) {
  const mode = argv[0]
  const opts = {provider: 'lmstudio', home: defaultHome, model: null, label: null}
  for (let i = 1; i < argv.length; i += 2) {
    if (argv[i] === '--model') opts.model = argv[i + 1]
    else if (argv[i] === '--provider') opts.provider = argv[i + 1]
    else if (argv[i] === '--home') opts.home = argv[i + 1]
    else if (argv[i] === '--label') opts.label = argv[i + 1]
  }
  if ((mode !== 'gate' && mode !== 'research') || !opts.model) return null
  return {mode, ...opts}
}

function lmsPsSnapshot() {
  try { return execFileSync('lms', ['ps', '--json'], {encoding: 'utf8', shell: true}) }
  catch (error) { return `lms ps --json failed: ${error?.stack ?? error}` }
}

async function main(argv) {
  const args = parseArgs(argv)
  if (!args) { process.stderr.write(usage + '\n'); process.exitCode = 2; return }
  const {mode, model, provider, home} = args
  const evidenceDir = path.join(repoRoot, 'stack', 'halo-router-dev', 'evidence', 'candidates', sanitize(model))
  await mkdir(evidenceDir, {recursive: true})

  let input
  if (mode === 'gate') {
    const cwd = path.join(home, 'acceptance', 'fixtures', `candidate-${sanitize(model)}-${Date.now()}`)
    await mkdir(cwd, {recursive: true})
    await createStructuredWriteFixture(cwd)
    input = {action: 'verified-coder', provider, model, cwd, prompt: STRUCTURED_WRITE_FIXTURE.prompt, routingSettings: {mode: 'manual'}, toolArguments: {description: 'Candidate model worker acceptance', prompt: STRUCTURED_WRITE_FIXTURE.prompt, editable_paths: ['add.py'], protected_paths: ['test_add.py'], verify_executable: 'python', verify_args: ['test_add.py']}}
  } else {
    input = {action: 'root-turn', provider, model, cwd: home, timeoutMs: 180000, routingSettings: {mode: 'manual'}, prompt: 'Connection test: use the Halo Research Gateway web_search tool to search for the official Model Context Protocol documentation. Then use its web_fetch tool to read https://example.com. Report the title from that page and one URL from the search. Do not use shell or browser alternatives. Keep the final answer under 80 words.'}
  }

  await writeFile(path.join(evidenceDir, `lms-ps-before-${Date.now()}.json`), lmsPsSnapshot())
  const result = await run({...input, timeoutMs: input.timeoutMs ?? 180000}, {home})
  await writeFile(path.join(evidenceDir, `lms-ps-after-${Date.now()}.json`), lmsPsSnapshot())

  const evidencePath = path.join(evidenceDir, `${mode}-${Date.now()}.json`)
  await writeFile(evidencePath, JSON.stringify(result, null, 2) + '\n')

  const observations = (result.routing?.records ?? []).filter(r => r.kind === 'observation')
  const outcomes = (result.routing?.records ?? []).filter(r => r.kind === 'outcome')
  const fail = reason => { console.log(JSON.stringify({pass: false, reason, evidencePath})); process.exitCode = 1 }

  if (result.status !== 'completed') return fail(`status was ${result.status}: ${JSON.stringify(result.error)}`)
  const matched = observations.find(o => o.actual?.provider === provider && (o.actual?.model === undefined || String(o.actual.model).includes(model)))
  if (!matched) return fail('no observation record matched the requested provider/model')

  if (mode === 'gate') {
    if (!outcomes.some(o => o.result === 'pass')) return fail('no outcome record with result "pass"')
  } else {
    const finalText = result.finalText ?? ''
    if (!finalText.includes('Example Domain')) return fail('finalText did not include "Example Domain"')
    if (!/https?:\/\/\S+/.test(finalText)) return fail('finalText did not contain a URL')
  }

  console.log(JSON.stringify({
    pass: true, mode, model, provider,
    requestId: result.requestId, sessionId: result.parentSessionId, durationMs: result.durationMs,
    actual: observations.map(o => o.actual), gate: outcomes.map(o => o.result),
    ...(mode === 'research' ? {finalText: (result.finalText ?? '').slice(0, 300)} : {}),
    evidencePath,
  }))
}

main(process.argv.slice(2)).catch(error => {
  process.stderr.write(`${error.stack ?? error}\n`)
  process.exitCode = 1
})
