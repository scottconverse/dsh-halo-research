import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { win32 as path } from 'node:path';
import { StringDecoder } from 'node:string_decoder';

const providers = new Set(['claude', 'codex']);
const authError = /not logged in|signed out|please (?:run|sign)|authentication (?:failed|required)|invalid (?:api key|token)|expired token|unauthorized|\b401\b/i;

/** Read-only CLI status command, not a login or inference. Raw account output is intentionally discarded. */
export async function probeNativeCli(options, { spawnImpl = spawn } = {}) {
  const { provider, timeoutMs = 10000 } = options;
  let executable, env;
  try {
    if (!providers.has(provider)) throw new Error('Unsupported provider');
    env = nativeCliEnvironment(options);
    executable = options.executable ?? findNativeCli(provider, { ...options, env });
    if (!executable || !path.isAbsolute(executable) || !/\.exe$/i.test(executable)) return { provider, status: 'not-installed' };
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 10000) throw new Error('Status timeout must be between 1 and 10000 milliseconds');
  } catch (error) { return { provider, status: 'failed', error: error.message }; }
  return new Promise(resolve => {
    let output = '', timer, child, done = false;
    const finish = result => { if (done) return; done = true; clearTimeout(timer); resolve({ provider, executable, ...result }); };
    try {
      child = spawnImpl(executable, provider === 'claude' ? ['auth', 'status', '--json'] : ['login', 'status'], { cwd: options.cwd ?? env.USERPROFILE, env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      for (const stream of [child.stdout, child.stderr]) { stream.setEncoding('utf8'); stream.on('data', data => { if (!done) output += data; }); }
      child.stdin.on('error', () => finish({ status: 'failed' }));
      child.on('error', () => finish({ status: 'failed' }));
      child.on('close', code => {
        if (done) return;
        if (provider === 'claude') {
          try {
            const record = JSON.parse(output);
            const method = ['claude.ai', 'oauth', 'api_key', 'api-key'].includes(record.authMethod) ? record.authMethod : 'unknown';
            finish({ status: code === 0 && record.loggedIn === true ? 'authenticated' : record.loggedIn === false ? 'auth-required' : 'unknown', authMethod: method });
          } catch { finish({ status: authError.test(output) ? 'auth-required' : 'unknown' }); }
        } else {
          const loggedIn = code === 0 && /logged in/i.test(output);
          finish({ status: loggedIn ? 'authenticated' : authError.test(output) ? 'auth-required' : 'unknown', authMethod: loggedIn ? (/API key/i.test(output) ? 'api-key' : /ChatGPT/i.test(output) ? 'chatgpt' : 'unknown') : 'unknown' });
        }
      });
      timer = setTimeout(() => {
        if (child.exitCode == null && Number.isInteger(child.pid) && child.pid > 0) {
          try {
            const killer = spawnImpl(path.join(env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore', env });
            killer.on('error', () => { try { child.kill(); } catch {} });
          } catch { try { child.kill(); } catch {} }
        }
        finish({ status: 'timeout', processExitUnconfirmed: true });
      }, timeoutMs);
      child.stdin.end();
    } catch { finish({ status: 'failed' }); }
  });
}

export function nativeCliEnvironment({ env = process.env, userHome = env.USERPROFILE } = {}) {
  if (!userHome || !path.isAbsolute(userHome)) throw new Error('An absolute normal Windows userHome is required');
  const result = { ...env };
  // Windows environment keys are case insensitive. Do not accidentally retain a differently cased override.
  const remove = new Set([
    'HOME', 'USERPROFILE', 'CODEX_HOME', 'CLAUDE_CONFIG_DIR', 'CLAUDECODE',
    'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_OAUTH_TOKEN',
    'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_API_BASE', 'CODEX_API_KEY', 'CODEX_ACCESS_TOKEN',
    'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY'
  ]);
  for (const key of Object.keys(result)) if (remove.has(key.toUpperCase())) delete result[key];
  Object.assign(result, { HOME: userHome, USERPROFILE: userHome, CODEX_HOME: path.join(userHome, '.codex'), CLAUDE_CONFIG_DIR: path.join(userHome, '.claude') });
  return result;
}

export function findNativeCli(provider, { env = process.env, userHome = env.USERPROFILE, exists = existsSync } = {}) {
  if (!providers.has(provider)) throw new Error(`Unsupported CLI provider: ${provider}`);
  if (!userHome) return null;
  const npm = path.join(userHome, 'AppData', 'Roaming', 'npm', 'node_modules');
  const candidates = provider === 'claude' ? [
    env.CLAUDE_CLI_PATH, path.join(userHome, '.local', 'bin', 'claude.exe'),
    path.join(npm, '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'),
    path.join(npm, '@anthropic-ai', 'claude-code', 'node_modules', '@anthropic-ai', 'claude-code-win32-x64', 'claude.exe')
  ] : [env.CODEX_CLI_PATH, path.join(npm, '@openai', 'codex', 'node_modules', '@openai', 'codex-win32-x64', 'vendor', 'x86_64-pc-windows-msvc', 'bin', 'codex.exe')];
  return candidates.find(file => file && path.isAbsolute(file) && /\.exe$/i.test(file) && exists(file)) ?? null;
}

function invocation({ provider, model, reasoningEffort, purpose = 'coding', persistent = false, resumeId, nativeSessionId }) {
  if (!providers.has(provider)) throw new Error(`Unsupported CLI provider: ${provider}`);
  if (!model || typeof model !== 'string') throw new Error('An explicit model is required');
  const auxiliary = purpose !== 'coding';
  if (auxiliary && !['title', 'session-title', 'compaction'].includes(purpose)) throw new Error(`Unsupported purpose: ${purpose}`);
  if (auxiliary && provider === 'codex') throw new Error('Codex auxiliary synthesis is unsupported: no verified tool-free native mode');
  for (const id of [resumeId, nativeSessionId]) if (id !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('An exact native UUID is required');
  if (resumeId && !persistent) throw new Error('Resume requires persistence');
  const args = provider === 'claude'
    ? ['-p', '--model', model, '--output-format', 'stream-json', '--verbose', ...(!persistent ? ['--no-session-persistence'] : resumeId ? ['--resume', resumeId] : nativeSessionId ? ['--session-id', nativeSessionId] : []), ...(auxiliary ? ['--tools', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--disable-slash-commands'] : ['--dangerously-skip-permissions'])]
    : ['exec', ...(resumeId ? ['resume', resumeId] : []), '--model', model, '--json', ...(!persistent ? ['--ephemeral'] : []), ...(!resumeId ? ['--color', 'never'] : []), '--skip-git-repo-check', '--dangerously-bypass-approvals-and-sandbox'];
  if (reasoningEffort !== undefined) {
    const allowed = provider === 'claude' ? ['low', 'medium', 'high', 'xhigh', 'max'] : ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
    if (!allowed.includes(reasoningEffort)) throw new Error(`Unsupported reasoning effort: ${reasoningEffort}`);
    args.push(...(provider === 'claude' ? ['--effort', reasoningEffort] : ['-c', `model_reasoning_effort="${reasoningEffort}"`]));
  }
  if (provider === 'codex') args.push('-');
  return args;
}

function normalize(raw) {
  const item = raw.item;
  const text = raw.type === 'result' ? raw.result : item?.type === 'agent_message' ? item.text : raw.type === 'assistant'
    ? raw.message?.content?.filter(block => block.type === 'text').map(block => block.text).join('\n') : undefined;
  return { type: raw.type ?? 'unknown', text: typeof text === 'string' ? text : '', raw };
}

/** Native provider execution. Returned tool records are evidence, NEVER instructions to execute again. */
export async function runNativeCli(options, { spawnImpl = spawn, now = () => performance.now() } = {}) {
  const { provider, model, cwd, prompt, signal, onEvent, timeoutMs = 600000, terminationGraceMs = 3000 } = options;
  const base = { provider, model, ok: false, status: 'failed', exitCode: null, final: '', text: '', events: [], errors: [], stderr: '', processExited: false };
  if (signal?.aborted) return { ...base, status: 'cancelled' };
  let args, env, executable;
  try {
    args = invocation(options); env = nativeCliEnvironment(options);
    executable = options.executable ?? findNativeCli(provider, { ...options, env });
    if (!executable || !path.isAbsolute(executable) || !/\.exe$/i.test(executable)) throw new Error('A native absolute .exe path is required (no shell shim)');
    if (!cwd || !path.isAbsolute(cwd)) throw new Error('An absolute working directory is required');
    if (typeof prompt !== 'string') throw new Error('Prompt must be a string');
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isFinite(terminationGraceMs) || terminationGraceMs <= 0) throw new Error('Timeouts must be positive finite milliseconds');
  } catch (error) { return { ...base, errors: [error.message] }; }

  return new Promise(resolve => {
    const startTick=now();
    let child, done = false, closed = false, timer, grace, stopStatus, terminal = false, refusal = false, terminalError = false, pending = '';
    const decoder = new StringDecoder('utf8');
    const result = { ...base, events: [], errors: [] };
    const finish = code => {
      if (done) return;
      done = true; clearTimeout(timer); clearTimeout(grace); signal?.removeEventListener('abort', abort);
      result.exitCode = code; result.processExited = closed;
      result.durationMs=Math.max(0,now()-startTick);
      if(options.resumeId&&result.threadId&&result.threadId!==options.resumeId)result.errors.push('Native resume returned a different thread ID; continuity is not proven.');
      const evidenceErrors = `${result.stderr}\n${result.errors.join('\n')}`;
      result.status = stopStatus ?? (refusal ? 'refused' : (code !== 0 || terminalError || result.errors.length || !terminal)
        ? (authError.test(evidenceErrors) ? 'auth-required' : 'failed') : 'completed');
      result.ok = result.status === 'completed'; result.text = result.final;
      resolve(result);
    };
    const stop = status => {
      if (done || stopStatus) return;
      stopStatus = status;
      if (!child || closed) { finish(child?.exitCode ?? null); return; }
      // We own this exact child, not every process with the same executable name.
      if (Number.isInteger(child.pid) && child.pid > 0 && child.exitCode == null) {
        try {
          const killer = spawnImpl(path.join(env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore', env });
          killer.on('error', error => { result.errors.push(`Tree termination failed: ${error.message}`); try { child.kill(); } catch {} });
          killer.on('close', code => { if (code !== 0 && !closed) { result.errors.push(`Tree termination exit ${code}`); try { child.kill(); } catch {} } });
        } catch (error) { result.errors.push(`Tree termination failed: ${error.message}`); try { child.kill(); } catch {} }
      }
      grace = setTimeout(() => { if (!closed) result.errors.push('Owned process exit not confirmed within termination grace'); finish(child.exitCode ?? null); }, terminationGraceMs);
    };
    const abort = () => stop('cancelled');
    const accept = line => {
      if (!line.trim()) return;
      let raw;
      try { raw = JSON.parse(line); if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Expected event object'); }
      catch { result.errors.push('Malformed CLI JSON event'); return; }
      const event = {...normalize(raw),elapsedMs:Math.max(0,now()-startTick)}; result.events.push(event);
      const nativeId = provider === 'codex' && raw.type === 'thread.started' ? raw.thread_id : provider === 'claude' ? raw.session_id : undefined;
      if (typeof nativeId === 'string' && /^[0-9a-f-]{36}$/i.test(nativeId)) result.threadId = nativeId;
      if (raw.type === 'refusal' || raw.item?.type === 'refusal' || raw.message?.content?.some?.(part => part.type === 'refusal')) refusal = true;
      if (provider === 'claude' && raw.type === 'result') {
        terminal = true;
        terminalError = raw.is_error === true || raw.subtype !== 'success';
        if (typeof raw.result === 'string') result.final = raw.result;
        if (terminalError) result.errors.push(typeof raw.result === 'string' ? raw.result : JSON.stringify(raw.errors ?? raw));
      }
      if (provider === 'codex') {
        if (raw.type === 'item.completed' && raw.item?.type === 'agent_message') result.final = raw.item.text ?? '';
        if (raw.type === 'turn.completed') terminal = true;
      }
      if (raw.type === 'error' || raw.type === 'turn.failed') { terminalError = true; result.errors.push(raw.message ?? raw.error?.message ?? JSON.stringify(raw)); }
      try { onEvent?.(event); } catch (error) { result.errors.push(`Event consumer failed: ${error.message}`); stop('failed'); }
    };
    const feed = text => { pending += text; let index; while ((index = pending.indexOf('\n')) >= 0) { accept(pending.slice(0, index)); pending = pending.slice(index + 1); } };
    try {
      child = spawnImpl(executable, args, { cwd, env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      result.pid = child.pid;
      child.stdout.on('data', data => { if (!done) feed(decoder.write(Buffer.isBuffer(data) ? data : Buffer.from(data))); });
      child.stderr.setEncoding('utf8'); child.stderr.on('data', data => { if (!done) result.stderr += data; });
      child.stdin.on('error', error => { result.errors.push(`stdin: ${error.message}`); stop('failed'); });
      child.on('error', error => { result.errors.push(`spawn: ${error.message}`); finish(null); });
      child.on('close', code => { closed = true; if (done) return; feed(decoder.end()); if (pending.trim()) accept(pending); pending = ''; finish(code); });
      signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => stop('timeout'), timeoutMs);
      if (signal?.aborted) abort(); else child.stdin.end(prompt);
    } catch (error) { result.errors.push(error.message); if (child) stop('failed'); else finish(null); }
  });
}
