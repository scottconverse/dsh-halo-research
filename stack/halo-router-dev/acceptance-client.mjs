import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const clientRoot = path.dirname(fileURLToPath(import.meta.url))
const defaultHome = path.join(clientRoot, 'home')
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function enqueueAcceptanceRequest(input, options = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('request must be a JSON object')
  const requestId = input.requestId ?? randomUUID()
  if (typeof requestId !== 'string' || !REQUEST_ID.test(requestId)) throw new Error('requestId is invalid')
  const home = path.resolve(options.home ?? defaultHome)
  const inbox = path.join(home, 'acceptance', 'inbox')
  const outbox = path.join(home, 'acceptance', 'outbox')
  await Promise.all([mkdir(inbox, { recursive: true }), mkdir(outbox, { recursive: true })])
  const requestPath = path.join(inbox, `${requestId}.json`)
  const responsePath = path.join(outbox, `${requestId}.json`)
  try {
    await access(responsePath)
    throw new Error(`response already exists for requestId ${requestId}`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  const temporary = `${requestPath}.${process.pid}.${randomUUID()}.tmp`
  const request = { ...input, schemaVersion: 1, requestId }
  await writeFile(temporary, `${JSON.stringify(request, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  await rename(temporary, requestPath)

  const timeoutMs = options.timeoutMs ?? Math.min(195_000, (request.timeoutMs ?? 180_000) + 15_000)
  const deadline = Date.now() + timeoutMs
  while (Date.now() <= deadline) {
    try {
      return JSON.parse(await readFile(responsePath, 'utf8'))
    } catch (error) {
      if (error?.code !== 'ENOENT' && error instanceof SyntaxError === false) throw error
    }
    await sleep(options.pollMs ?? 250)
  }
  throw new Error(`timed out waiting for ${responsePath}`)
}

async function main(argv) {
  const requestFile = argv[0]
  if (!requestFile) throw new Error('usage: node acceptance-client.mjs <request.json> [--timeout-ms <milliseconds>]')
  if (requestFile === '--self-test') {
    const { applyRoutingSettings, qualificationAcceptance, qualificationResultPayloads, qualificationStartPayload } = await import('./acceptance-driver.mjs')
    assert.equal(qualificationAcceptance(true, []).status, 'acceptance-failed')
    assert.deepEqual(
      qualificationStartPayload({ sessionId: 'child', role: 'structured_write', prompt: 'fixture', cwd: 'C:\\stage', action: 'verified-coder', verificationCwd: 'C:\\fixture' }),
      { sessionId: 'child', role: 'structured_write', prompt: 'fixture', cwd: 'C:\\stage', verificationCwd: 'C:\\fixture' },
    )
    assert.deepEqual(
      qualificationStartPayload({ sessionId: 'child', role: 'analysis', prompt: 'fixture', cwd: 'C:\\work', action: 'subagent', verificationCwd: 'C:\\fixture' }),
      { sessionId: 'child', role: 'analysis', prompt: 'fixture', cwd: 'C:\\work' },
    )
    assert.deepEqual(
      qualificationResultPayloads(['retry-worker-1', 'retry-worker-2'], { action: 'verified-coder', completed: true }),
      [
        { sessionId: 'retry-worker-1', completed: false },
        { sessionId: 'retry-worker-2', completed: true },
      ],
    )
    const configureCalls = []
    const routingStatus = await applyRoutingSettings({
      async configure(payload) {
        configureCalls.push(payload)
        return { settings: payload.settings, sessionId: payload.sessionId }
      },
    }, 'acceptance-parent', { mode: 'automatic', worker: 'codex-cli/codex' })
    assert.deepEqual(configureCalls, [{
      sessionId: 'acceptance-parent', settings: { mode: 'automatic', worker: 'codex-cli/codex' },
    }])
    assert.deepEqual(routingStatus, {
      settings: { mode: 'automatic', worker: 'codex-cli/codex' }, sessionId: 'acceptance-parent',
    })
    process.stdout.write('acceptance-client self-test: 5 passed\n')
    return
  }
  const timeoutIndex = argv.indexOf('--timeout-ms')
  const timeoutMs = timeoutIndex >= 0 ? Number(argv[timeoutIndex + 1]) : undefined
  if (timeoutMs !== undefined && (!Number.isInteger(timeoutMs) || timeoutMs < 1)) throw new Error('--timeout-ms must be a positive integer')
  const request = JSON.parse(await readFile(path.resolve(requestFile), 'utf8'))
  const receipt = await enqueueAcceptanceRequest(request, { ...(timeoutMs === undefined ? {} : { timeoutMs }) })
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`)
  if (receipt.status !== 'completed') process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${error.stack ?? error}\n`)
    process.exitCode = 1
  })
}
