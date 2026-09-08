import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const name = 'halo-router-dev-acceptance-driver'
export const inject = ['agents', 'subagents', 'tools', 'sessions', 'haloRouting']

const SCHEMA_VERSION = 1
const DEFAULT_TIMEOUT_MS = 180_000
const MAX_TIMEOUT_MS = 180_000
const POLL_MS = 250
const ROUTING_SETTLE_MS = 10_000
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const ACTIONS = new Set(['root-turn', 'subagent', 'direct-worker', 'verified-coder', 'recommend'])

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const iso = () => new Date().toISOString()
const textOf = blocks => (Array.isArray(blocks) ? blocks : [])
  .filter(block => block?.type === 'text' && typeof block.text === 'string')
  .map(block => block.text)
  .join('')

function jsonClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function errorRecord(error) {
  return {
    name: typeof error?.name === 'string' ? error.name : 'Error',
    message: typeof error?.message === 'string' ? error.message : String(error),
    ...(typeof error?.code === 'string' ? { code: error.code } : {}),
    ...(typeof error?.stack === 'string' ? { stack: error.stack } : {}),
  }
}

// Pure protocol seams are exported for the client's zero-model self-test.
export function qualificationAcceptance(expectQualification, records) {
  const qualificationRecords = (records ?? []).filter(row => row?.kind === 'qualification')
  if (expectQualification && qualificationRecords.length === 0) {
    return {
      accepted: false,
      status: 'acceptance-failed',
      error: {
        name: 'AcceptanceError',
        code: 'QUALIFICATION_RECORD_MISSING',
        message: 'the bounded evidence wait ended without the requested router qualification record',
      },
    }
  }
  return { accepted: true, status: 'completed' }
}

export function qualificationStartPayload({ sessionId, role, prompt, cwd, action, verificationCwd }) {
  return {
    sessionId,
    role,
    prompt,
    cwd,
    ...(action === 'verified-coder' ? { verificationCwd } : {}),
  }
}

export function qualificationResultPayloads(targetIds, { action, completed = false, explicitSessionId } = {}) {
  const completedSessionId = completed
    ? action === 'verified-coder'
      ? targetIds.at(-1)
      : explicitSessionId ?? targetIds[0]
    : undefined
  return targetIds.map(sessionId => ({ sessionId, completed: sessionId === completedSessionId }))
}

export async function applyRoutingSettings(routing, sessionId, settings) {
  if (settings === undefined) return undefined
  if (typeof routing?.configure !== 'function') throw new Error('haloRouting.configure is unavailable')
  return await routing.configure({ sessionId, settings: jsonClone(settings) })
}

async function atomicJson(file, value) {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  await rename(temporary, file)
}

async function validateRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('request must be a JSON object')
  if (input.schemaVersion !== undefined && input.schemaVersion !== SCHEMA_VERSION) throw new Error(`schemaVersion must be ${SCHEMA_VERSION}`)
  if (typeof input.requestId !== 'string' || !REQUEST_ID.test(input.requestId)) throw new Error('requestId is invalid')
  if (!ACTIONS.has(input.action)) throw new Error(`action must be one of: ${[...ACTIONS].join(', ')}`)
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) throw new Error(`timeoutMs must be an integer from 1 through ${MAX_TIMEOUT_MS}`)
  if (input.routingSettings !== undefined && (!input.routingSettings || typeof input.routingSettings !== 'object' || Array.isArray(input.routingSettings))) {
    throw new Error('routingSettings must be an object')
  }
  if (input.action === 'recommend') {
    if (input.routingSettings !== undefined) throw new Error('routingSettings requires an agent action')
    if (!input.workload || typeof input.workload !== 'object' || Array.isArray(input.workload)) throw new Error('recommend requires a workload object')
    return { ...input, schemaVersion: SCHEMA_VERSION, timeoutMs }
  }
  if (typeof input.cwd !== 'string' || !path.isAbsolute(input.cwd)) throw new Error('cwd must be an absolute path')
  const cwdState = await stat(input.cwd)
  if (!cwdState.isDirectory()) throw new Error('cwd must name an existing directory')
  for (const field of ['provider', 'model', 'prompt']) {
    if (typeof input[field] !== 'string' || input[field].trim() === '') throw new Error(`${field} must be a non-empty string`)
  }
  if (input.provider.length > 256 || input.model.length > 512 || input.prompt.length > 100_000) throw new Error('provider, model, or prompt exceeds its bounded size')
  if (input.action === 'verified-coder' && (!input.toolArguments || typeof input.toolArguments !== 'object' || Array.isArray(input.toolArguments))) {
    throw new Error('verified-coder requires toolArguments')
  }
  if (input.structuredWriteFixtureReceiptPath !== undefined) throw new Error('external structured-write receipt paths are not accepted')
  if (input.verifier !== undefined && (!input.verifier || typeof input.verifier !== 'object' || Array.isArray(input.verifier))) {
    throw new Error('verifier must be an object')
  }
  return { ...input, schemaVersion: SCHEMA_VERSION, cwd: path.resolve(input.cwd), timeoutMs }
}

function startQualificationSignals(ctx, parent, request) {
  const spec = request.qualification
  if (!spec) return { targetIds: [], rootStart() {}, finish() {}, stop() {} }
  if (!['analysis', 'benchmark', 'structured_write'].includes(spec.role)) throw new Error('qualification.role must be analysis, benchmark, or structured_write')
  const dispatchedPrompt = request.action === 'verified-coder' ? request.toolArguments?.prompt : request.prompt
  const prompt = spec.prompt ?? dispatchedPrompt
  if (typeof prompt !== 'string' || prompt === '') throw new Error('qualification prompt is required')
  if (prompt !== dispatchedPrompt) throw new Error('qualification prompt must exactly match the dispatched prompt')
  const stagingParents = new Set()
  const targetIds = []
  let finished = false
  const announce = (sessionId, cwd) => {
    if (targetIds.includes(sessionId)) return
    targetIds.push(sessionId)
    ctx.emit('halo-routing/qualification-start', qualificationStartPayload({
      sessionId,
      role: spec.role,
      prompt,
      cwd,
      action: request.action,
      verificationCwd: request.cwd,
    }))
  }
  const stop = ctx.on('agent/created', ({ agent }) => {
    const parentSession = agent.session?.header?.parentSession
    const origin = agent.session?.header?.origin
    if (parentSession === parent.agent.id) {
      if (origin === 'subagent') announce(agent.id, agent.session.header.cwd)
      else if (request.action === 'verified-coder') stagingParents.add(agent.id)
      return
    }
    // A gate worker is one level below its programmatic staging parent. Do not
    // recurse through the worker: its own auxiliary children are not candidate
    // executions and must never inherit the gate's final verdict.
    if (request.action === 'verified-coder' && stagingParents.has(parentSession) && origin === 'subagent') {
      announce(agent.id, agent.session.header.cwd)
    }
  }, { global: true })
  return {
    targetIds,
    rootStart() { announce(parent.agent.id, parent.agent.session.header.cwd) },
    finish(extra = {}) {
      if (finished) return
      finished = true
      for (const payload of qualificationResultPayloads(targetIds, extra)) ctx.emit('halo-routing/qualification-result', payload)
    },
    stop,
  }
}

function verifyText(text, spec) {
  if (spec === undefined) return { kind: 'none', passed: false, diagnostic: 'no independent verifier supplied' }
  if (spec.kind === 'exact-text') {
    if (typeof spec.expected !== 'string') throw new Error('exact-text verifier requires expected')
    const actual = text.trim()
    return { kind: spec.kind, expected: spec.expected, actual, passed: actual === spec.expected }
  }
  if (spec.kind === 'json-number') {
    if (typeof spec.property !== 'string' || spec.property === '' || typeof spec.expected !== 'number' || !Number.isFinite(spec.expected)) {
      throw new Error('json-number verifier requires property and finite numeric expected')
    }
    let source = text.trim()
    if (/^```(?:json)?\s*[\s\S]*\s*```$/i.test(source)) source = source.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    try {
      const parsed = JSON.parse(source)
      const actual = parsed?.[spec.property]
      return { kind: spec.kind, property: spec.property, expected: spec.expected, actual, passed: typeof actual === 'number' && actual === spec.expected }
    } catch (error) {
      return { kind: spec.kind, property: spec.property, expected: spec.expected, passed: false, diagnostic: `JSON parse failed: ${error.message}` }
    }
  }
  throw new Error(`unsupported verifier kind: ${String(spec.kind)}`)
}

function createUserMessage(text) {
  return {
    id: randomUUID(),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  }
}

function finalAssistantText(events) {
  let output = ''
  for (const event of events ?? []) {
    if (event?.type === 'assistant/message') output = textOf(event.data?.message?.content) || output
  }
  return output
}

function startTranscriptCapture(ctx, parent) {
  const included = new Set([parent.agent.id])
  const events = new Map([[parent.agent.id, jsonClone(parent.agent.session.events)]])
  const stop = ctx.on('session/event', (session, event) => {
    const parentSession = session?.header?.parentSession
    if (session.id !== parent.agent.id && !included.has(parentSession)) return
    included.add(session.id)
    const list = events.get(session.id) ?? []
    list.push(jsonClone(event))
    events.set(session.id, list)
  }, { global: true })
  return {
    included,
    stop,
    snapshot() {
      events.set(parent.agent.id, jsonClone(parent.agent.session.events))
      return [...included].map(sessionId => ({ sessionId, events: events.get(sessionId) ?? [] }))
    },
  }
}

async function createParent(ctx, request, signal) {
  const sessionId = `halo-acceptance-${request.requestId}-${randomUUID()}`
  return await ctx.agents.create({
    sessionId,
    meta: { cwd: request.cwd, agentPreset: request.agentPreset ?? 'halo-orchestrator' },
    agentOptions: { provider: request.provider, model: request.model, ...(request.maxTokens ? { maxTokens: request.maxTokens } : {}) },
    signal,
    async setup(agentCtx) {
      const presets = agentCtx.get?.('agentPresets')
      if (!presets) throw new Error('agentPresets service is unavailable')
      await presets.mount(agentCtx, request.agentPreset ?? 'halo-orchestrator')
    },
  })
}

async function runRootTurn(ctx, parent, request, signal) {
  const onAbort = () => parent.agent.cancel({ kind: 'hook', reason: 'acceptance-driver-timeout' })
  signal.addEventListener('abort', onAbort, { once: true })
  try {
    if (signal.aborted) throw signal.reason
    parent.agent.followup(createUserMessage(request.prompt))
    await parent.agent.whenIdle()
    if (signal.aborted) throw signal.reason
    const events = jsonClone(parent.agent.session.events)
    const turnEnd = events.findLast(event => event?.type === 'turn/end')
    const reason = turnEnd?.data?.reason ?? null
    return { finalText: finalAssistantText(events), terminal: { stopReason: reason?.kind ?? 'error', reason } }
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

async function runDirectWorker(ctx, parent, request, signal) {
  let run
  try {
    run = await ctx.agents.withInitiator(parent.agent, () => ctx.subagents.start(request.subagentProvider ?? 'spawn', {
      label: request.label ?? `DEV acceptance ${request.requestId}`,
      prompt: [{ type: 'text', text: request.prompt }],
      parent: parent.agent,
      signal,
      agentOptions: { provider: request.provider, model: request.model, ...(request.maxTokens ? { maxTokens: request.maxTokens } : {}) },
      ...(typeof request.persona === 'string' ? { persona: request.persona } : {}),
    }))
    const terminal = await run.result
    return {
      finalText: textOf(terminal.output),
      childSessionId: run.id,
      terminal: jsonClone(terminal),
    }
  } finally {
    if (run) await run.dispose()
  }
}

async function runVerifiedCoder(ctx, parent, request, signal) {
  const callId = `halo-acceptance-tool-${randomUUID()}`
  const result = await ctx.agents.withInitiator(parent.agent, () => ctx.tools.execute({
    callId,
    name: 'subagent_coder',
    arguments: request.toolArguments,
    agent: parent.agent,
    signal,
  }))
  return {
    finalText: textOf(result.content),
    tool: { callId, ...jsonClone(result) },
    terminal: { stopReason: result.isError ? 'error' : 'completed' },
  }
}

async function routingEvidence(home, sessionIds, signal, { expectQualification = false, expectOutcome = false } = {}) {
  const file = path.join(home, 'halo-routing', 'records.json')
  const wanted = new Set(sessionIds)
  const deadline = Date.now() + ROUTING_SETTLE_MS
  let matched = []
  while (!signal.aborted && Date.now() <= deadline) {
    try {
      const records = JSON.parse(await readFile(file, 'utf8'))
      const observations = records.filter(row => row?.kind === 'observation' && wanted.has(row.sessionId))
      const ids = new Set(observations.map(row => row.observationId))
      matched = records.filter(row => ids.has(row?.observationId))
      const hasTerminal = matched.some(row => row.kind === 'measurement' && row.executionProfileObservation?.phase === 'post-terminal')
      const hasQualification = matched.some(row => row.kind === 'qualification')
      const hasOutcome=matched.some(row=>row.kind==='outcome')
      if (hasTerminal && (!expectQualification || hasQualification) && (!expectOutcome || hasOutcome)) break
    } catch {}
    await sleep(POLL_MS)
  }
  const postTerminal = matched.filter(row => row.kind === 'measurement' && row.executionProfileObservation?.phase === 'post-terminal')
  const latest = postTerminal.at(-1)
  return {
    records: matched,
    executionFingerprint: latest?.executionProfileObservation?.fingerprint ?? null,
    profile: latest?.executionProfileObservation?.profile ?? null,
    phase: latest?.executionProfileObservation?.phase ?? null,
  }
}

async function runRecommendation(ctx, request) {
  const routing = ctx.get?.('haloRouting')
  if (!routing || typeof routing.recommend !== 'function') throw new Error('haloRouting.recommend is unavailable')
  return await routing.recommend(jsonClone(request.workload))
}

async function executeRequest(ctx, home, raw) {
  const startedAt = iso()
  const started = Date.now()
  let request
  let parent
  let capture
  let qualificationSignals
  let actionResult
  let routingConfiguration
  const controller = new AbortController()
  let timer
  try {
    request = await validateRequest(raw)
    timer = setTimeout(() => controller.abort(new Error(`acceptance request exceeded ${request.timeoutMs}ms`)), request.timeoutMs)
    if (request.action === 'recommend') {
      const recommendation = await runRecommendation(ctx, request)
      return {
        schemaVersion: SCHEMA_VERSION,
        requestId: request.requestId,
        status: 'completed',
        action: request.action,
        startedAt,
        finishedAt: iso(),
        durationMs: Date.now() - started,
        workload: jsonClone(request.workload),
        recommendation: jsonClone(recommendation),
      }
    }
    parent = await createParent(ctx, request, controller.signal)
    routingConfiguration = await applyRoutingSettings(ctx.haloRouting ?? ctx.get?.('haloRouting'), parent.agent.id, request.routingSettings)
    capture = startTranscriptCapture(ctx, parent)
    qualificationSignals = startQualificationSignals(ctx, parent, request)
    if (request.action === 'root-turn') {
      qualificationSignals.rootStart()
      actionResult = await runRootTurn(ctx, parent, request, controller.signal)
    }
    else if (request.action === 'subagent' || request.action === 'direct-worker') actionResult = await runDirectWorker(ctx, parent, request, controller.signal)
    else actionResult = await runVerifiedCoder(ctx, parent, request, controller.signal)

    qualificationSignals.finish({
      action: request.action,
      completed: actionResult.terminal?.stopReason === 'completed',
      explicitSessionId: request.action === 'root-turn' ? parent.agent.id : actionResult.childSessionId,
    })

    const transcripts = capture.snapshot()
    const sessionIds = transcripts.map(item => item.sessionId)
    const routing = await routingEvidence(home, sessionIds, controller.signal, { expectQualification: Boolean(request.qualification), expectOutcome:request.action==='verified-coder' })
    const verification = verifyText(actionResult.finalText, request.verifier)
    const qualificationRecords = routing.records.filter(row => row.kind === 'qualification')
    const acceptance = qualificationAcceptance(Boolean(request.qualification), qualificationRecords)
    const finishedAt = iso()
    return {
      schemaVersion: SCHEMA_VERSION,
      requestId: request.requestId,
      status: acceptance.status,
      action: request.action,
      startedAt,
      finishedAt,
      durationMs: Date.now() - started,
      parentSessionId: parent.agent.id,
      childSessionIds: sessionIds.filter(id => id !== parent.agent.id),
      finalText: actionResult.finalText,
      terminal: actionResult.terminal,
      ...(actionResult.childSessionId ? { childSessionId: actionResult.childSessionId } : {}),
      ...(actionResult.tool ? { tool: actionResult.tool } : {}),
      ...(request.routingSettings === undefined ? {} : {
        routingSettings: jsonClone(request.routingSettings),
        routingConfiguration: jsonClone(routingConfiguration),
      }),
      transcripts,
      routing,
      qualificationRecords,
      acceptance,
      ...(acceptance.error ? { error: acceptance.error } : {}),
      driverVerification: {
        authority: 'diagnostic-only',
        id: request.verifier?.id ?? `independent-${verification.kind}`,
        version: request.verifier?.version ?? '1',
        ...verification,
      },
    }
  } catch (error) {
    qualificationSignals?.finish({ action: request?.action, completed: false })
    return {
      schemaVersion: SCHEMA_VERSION,
      requestId: typeof raw?.requestId === 'string' ? raw.requestId : null,
      status: controller.signal.aborted ? 'timeout' : 'error',
      action: raw?.action ?? null,
      startedAt,
      finishedAt: iso(),
      durationMs: Date.now() - started,
      ...(parent ? { parentSessionId: parent.agent.id } : {}),
      ...(capture ? { transcripts: capture.snapshot() } : {}),
      error: errorRecord(error),
    }
  } finally {
    clearTimeout(timer)
    qualificationSignals?.stop()
    capture?.stop()
    if (parent) {
      try { await parent.dispose() } catch {}
    }
  }
}

export async function apply(ctx, config = {}) {
  const home = path.resolve(config.home ?? process.env.DSH_HOME ?? '')
  if (!process.env.DSH_HOME || home !== path.resolve(process.env.DSH_HOME)) throw new Error('acceptance driver requires its explicit DEV DSH_HOME')
  const root = path.join(home, 'acceptance')
  const inbox = path.join(root, 'inbox')
  const working = path.join(root, 'working')
  const requests = path.join(root, 'requests')
  const outbox = path.join(root, 'outbox')
  await Promise.all([inbox, working, requests, outbox].map(directory => mkdir(directory, { recursive: true })))

  let closed = false
  let pumping = false
  let current
  async function pump() {
    if (closed || pumping) return
    pumping = true
    try {
      const names = (await readdir(inbox)).filter(name => name.endsWith('.json')).sort()
      for (const name of names) {
        if (closed) break
        const requestId = name.slice(0, -5)
        if (!REQUEST_ID.test(requestId)) continue
        const source = path.join(inbox, name)
        const claimed = path.join(working, name)
        try { await rename(source, claimed) } catch { continue }
        current = claimed
        let raw
        let receipt
        try {
          raw = JSON.parse(await readFile(claimed, 'utf8'))
          if (raw.requestId !== requestId) throw new Error('requestId must match the inbox filename')
          receipt = await executeRequest(ctx, home, raw)
        } catch (error) {
          receipt = {
            schemaVersion: SCHEMA_VERSION,
            requestId,
            status: 'error',
            action: raw?.action ?? null,
            startedAt: iso(),
            finishedAt: iso(),
            durationMs: 0,
            error: errorRecord(error),
          }
        }
        await atomicJson(path.join(outbox, name), receipt)
        await rename(claimed, path.join(requests, name)).catch(async () => { await unlink(claimed).catch(() => {}) })
        current = undefined
      }
    } finally {
      pumping = false
    }
  }

  const tick=()=>{if(closed||!ctx.get('agents'))return;try{ctx.get('agents').withoutInitiator(()=>pump().catch(error=>ctx.logger.error(error)))}catch(error){if(!closed)ctx.logger.error(error)}}
  const interval = setInterval(tick, config.pollMs ?? POLL_MS)
  interval.unref()
  queueMicrotask(tick)
  ctx.effect(() => async () => {
    closed = true
    clearInterval(interval)
    while (pumping) await sleep(25)
    if (current) ctx.logger.warn(`acceptance request remains claimed at ${current}`)
  })
}
