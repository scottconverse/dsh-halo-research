import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { runNativeCli, findNativeCli, nativeCliEnvironment, probeNativeCli } from './cli-runtime.mjs';

test('Claude discovery finds the newest actual MSIX CLI without selecting the desktop UI executable', () => {
  const home='C:\\Users\\fixture';
  const root=home+'\\AppData\\Local\\Packages';
  const cliRoot=root+'\\Claude_fixture\\LocalCache\\Roaming\\Claude\\claude-code';
  const tree=new Map([[root,['Claude_fixture','Other_app']],[cliRoot,['2.1.9','2.1.10','not-a-version']],
    [cliRoot+'\\2.1.9',['oldhash']],[cliRoot+'\\2.1.10',['newhash']]]);
  const readDir=(path)=>{if(!tree.has(path))throw new Error('missing');return tree.get(path).map(name=>({name,isDirectory:()=>true}));};
  const newest=cliRoot+'\\2.1.10\\newhash\\claude.exe';
  const result=findNativeCli('claude',{env:{},userHome:home,readDir,exists:path=>path===newest||path===cliRoot+'\\2.1.9\\oldhash\\claude.exe'});
  assert.equal(result,newest);
});

function harness(action) {
  const calls = [];
  const child = new EventEmitter();
  Object.assign(child, { pid: 4242, exitCode: null, stdout: new PassThrough(), stderr: new PassThrough(), stdin: new PassThrough(), kill: () => true });
  const close = (code = 0) => { child.exitCode = code; child.emit('close', code); };
  const spawnImpl = (exe, args, options) => {
    calls.push({ exe, args, options });
    if (calls.length > 1) {
      const killer = new EventEmitter();
      queueMicrotask(() => { close(1); killer.emit('close', 0); });
      return killer;
    }
    queueMicrotask(() => action?.({ child, close }));
    return child;
  };
  return { calls, child, spawnImpl };
}
const options = { provider: 'claude', executable: 'C:\\native\\claude.exe', model: 'sonnet', prompt: 'Build the app. $()', cwd: 'C:\\dev\\fixture', userHome: 'C:\\Users\\scott', timeoutMs: 1000 };
const line = (child, event) => child.stdout.write(JSON.stringify(event) + '\n');

test('event timestamps and run duration use an injected monotonic clock',async()=>{
  let tick=10;
  const h=harness(({child,close})=>{tick=60;line(child,{type:'item.completed',item:{type:'agent_message',text:'ok'}});tick=90;line(child,{type:'turn.completed'});tick=110;close();});
  const r=await runNativeCli({...options,provider:'codex'},{...h,now:()=>tick});
  assert.equal(r.events[0].elapsedMs,50);assert.equal(r.events[1].elapsedMs,80);assert.equal(r.durationMs,100);
});

test('Claude native result, original stdin, normal homes, no API keys and no restricted tool list', async () => {
  const h = harness(({ child, close }) => { line(child, { type: 'result', subtype: 'success', is_error: false, result: 'Done ✓' }); close(); });
  const result = await runNativeCli({ ...options, reasoningEffort: 'high', env: { HOME: 'C:\\empty', CODEX_HOME: 'C:\\empty', ANTHROPIC_API_KEY: 'not-a-real-key', OPENAI_API_KEY: 'not-a-real-key' } }, h);
  assert.equal(result.ok, true);
  assert.equal(result.final, 'Done ✓');
  assert.equal(h.child.stdin.read().toString(), options.prompt);
  assert.equal(h.calls[0].options.shell, false);
  assert.equal(h.calls[0].options.env.HOME, options.userHome);
  assert.equal(h.calls[0].options.env.CODEX_HOME, 'C:\\Users\\scott\\.codex');
  assert.equal(h.calls[0].options.env.CLAUDE_CONFIG_DIR, 'C:\\Users\\scott\\.claude');
  assert.equal(h.calls[0].options.env.ANTHROPIC_API_KEY, undefined);
  assert.equal(h.calls[0].options.env.OPENAI_API_KEY, undefined);
  assert.ok(h.calls[0].args.includes('--dangerously-skip-permissions'));
  assert.ok(!h.calls[0].args.includes('--allowed-tools'));
  assert.ok(h.calls[0].args.includes('--effort'));
});

test('Codex events preserve raw records and terminal final; no shell and full native access', async () => {
  const seen = [];
  const h = harness(({ child, close }) => {
    line(child, { type: 'item.completed', item: { type: 'command_execution', command: 'node test.mjs', exit_code: 0 } });
    line(child, { type: 'item.completed', item: { type: 'agent_message', text: 'Built and tested' } });
    line(child, { type: 'turn.completed', usage: { input_tokens: 30 } }); close();
  });
  const r = await runNativeCli({ ...options, provider: 'codex', executable: 'C:\\native\\codex.exe', model: 'gpt-5.6', reasoningEffort: 'high', onEvent: e => seen.push(e) }, h);
  assert.equal(r.status, 'completed'); assert.equal(r.final, 'Built and tested');
  assert.equal(seen[0].raw.item.type, 'command_execution');
  assert.ok(h.calls[0].args.includes('--json'));
  assert.ok(h.calls[0].args.includes('--dangerously-bypass-approvals-and-sandbox'));
  assert.ok(h.calls[0].args.includes('model_reasoning_effort="high"'));
});

test('split UTF8 and last line without newline are parsed intact', async () => {
  const h = harness(({ child, close }) => {
    const data = Buffer.from(JSON.stringify({ type: 'result', subtype: 'success', result: '✓ final', is_error: false }));
    const index = data.indexOf(Buffer.from('✓'));
    child.stdout.write(data.subarray(0, index + 1)); child.stdout.write(data.subarray(index + 1)); close();
  });
  assert.equal((await runNativeCli(options, h)).final, '✓ final');
});

test('nonzero exit cannot be masked by success event; ordinary auth prose is not an auth failure', async () => {
  const h = harness(({ child, close }) => { line(child, { type: 'result', subtype: 'success', result: 'Documented unauthorized 401', is_error: false }); close(3); });
  assert.equal((await runNativeCli(options, h)).status, 'failed');
});

test('authentication error is classified distinctly', async () => {
  const h = harness(({ child, close }) => { child.stderr.write('Not logged in. Please run claude /login'); close(1); });
  assert.equal((await runNativeCli(options, h)).status, 'auth-required');
});

test('explicit refusal is not completion', async () => {
  const h = harness(({ child, close }) => { line(child, { type: 'refusal', message: 'Provider declined' }); close(); });
  assert.equal((await runNativeCli(options, h)).status, 'refused');
});

test('empty/malformed output and Codex turn.failed fail closed', async () => {
  for (const payload of ['', 'not json\n', JSON.stringify({ type: 'turn.failed', error: { message: 'Backend failed' } })]) {
    const h = harness(({ child, close }) => { child.stdout.write(payload); close(); });
    assert.equal((await runNativeCli({ ...options, provider: 'codex' }, h)).status, 'failed');
  }
});

test('already cancelled request spawns nothing', async () => {
  const h = harness(); const controller = new AbortController(); controller.abort();
  assert.equal((await runNativeCli({ ...options, signal: controller.signal }, h)).status, 'cancelled');
  assert.equal(h.calls.length, 0);
});

test('timeout kills only owned PID tree and returns timeout', async () => {
  const h = harness();
  const r = await runNativeCli({ ...options, timeoutMs: 10 }, h);
  assert.equal(r.status, 'timeout');
  assert.deepEqual(h.calls[1].args, ['/PID', '4242', '/T', '/F']);
  assert.equal(h.calls[1].options.shell, false);
  assert.equal(r.processExited, true);
});

test('mid-run cancellation stops owned process', async () => {
  const controller = new AbortController(); const h = harness(() => controller.abort());
  assert.equal((await runNativeCli({ ...options, signal: controller.signal }, h)).status, 'cancelled');
  assert.equal(h.calls.length, 2);
});

test('spawn failure and stdin errors return failure rather than hanging', async () => {
  const h = harness(({ child }) => child.emit('error', new Error('ENOENT')));
  assert.equal((await runNativeCli(options, h)).status, 'failed');
  const h2 = harness(({ child, close }) => { child.stdin.emit('error', new Error('EPIPE')); close(1); });
  assert.equal((await runNativeCli(options, h2)).status, 'failed');
});

test('native discovery uses existing user binary and never a shell shim', () => {
  const wanted = 'C:\\Users\\scott\\.local\\bin\\claude.exe';
  assert.equal(findNativeCli('claude', { userHome: options.userHome, env: { CLAUDE_CLI_PATH: 'C:\\claude.cmd' }, exists: file => file === wanted }), wanted);
  assert.equal(findNativeCli('codex', { userHome: options.userHome, env: {}, exists: () => false }), null);
  assert.equal(nativeCliEnvironment({ userHome: options.userHome, env: { home: 'empty', openai_api_key: 'fake' } }).home, undefined);
});

test('official subscription children discard inherited token, base URL and backend redirects', () => {
  const overrides = ['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'OPENAI_BASE_URL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY', 'CLAUDE_CODE_OAUTH_TOKEN', 'CODEX_API_KEY', 'CODEX_ACCESS_TOKEN'];
  const env = Object.fromEntries(overrides.map(key => [key.toLowerCase(), 'external-override']));
  env.PATH = 'normal native tools';
  const normalized = nativeCliEnvironment({ userHome: options.userHome, env });
  for (const key of overrides) assert.equal(normalized[key.toLowerCase()], undefined, key);
  assert.equal(normalized.PATH, env.PATH);
  assert.equal(env.anthropic_auth_token, 'external-override', 'must not modify caller environment');
});

test('Claude auxiliary requests disable tools; Codex auxiliary explicitly unsupported', async () => {
  const h = harness(({ child, close }) => { line(child, { type: 'result', subtype: 'success', result: 'Summary', is_error: false }); close(); });
  assert.equal((await runNativeCli({ ...options, purpose: 'compaction' }, h)).ok, true);
  assert.ok(h.calls[0].args.includes('--tools')); assert.equal(h.calls[0].args[h.calls[0].args.indexOf('--tools') + 1], '');
  assert.ok(!h.calls[0].args.includes('--dangerously-skip-permissions'));
  assert.ok(h.calls[0].args.includes('--strict-mcp-config'));
  assert.ok(h.calls[0].args.includes('--disable-slash-commands'));
  const h2 = harness();
  const r = await runNativeCli({ ...options, provider: 'codex', purpose: 'session-title' }, h2);
  assert.equal(r.ok, false); assert.match(r.errors[0], /unsupported/); assert.equal(h2.calls.length, 0);
});

test('status probe returns only login method, never raw account/key status', async () => {
  const h = harness(({ child, close }) => { child.stdout.write(JSON.stringify({ loggedIn: true, authMethod: 'claude.ai', subscriptionType: 'max', email: 'private@example.test', apiKey: 'must-not-return' })); close(); });
  const r = await probeNativeCli(options, h);
  assert.equal(r.status, 'authenticated'); assert.equal(r.authMethod, 'claude.ai');
  assert.deepEqual(h.calls[0].args, ['auth', 'status', '--json']);
  assert.ok(!JSON.stringify(r).includes('private@example')); assert.ok(!JSON.stringify(r).includes('must-not-return'));
});

test('Codex probe categorizes API login without returning key fragments', async () => {
  const h = harness(({ child, close }) => { child.stderr.write('Logged in using an API key - sk-123hidden'); close(); });
  const r = await probeNativeCli({ ...options, provider: 'codex' }, h);
  assert.equal(r.status, 'authenticated'); assert.equal(r.authMethod, 'api-key');
  assert.ok(!JSON.stringify(r).includes('hidden'));
});

test('native resumable turns use exact IDs and retain persistence without shell or weaker permissions',async()=>{
 for(const provider of ['codex','claude']){
  const id='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const h=harness(({child,close})=>{line(child,provider==='codex'?{type:'thread.started',thread_id:id}:{type:'system',subtype:'init',session_id:id});line(child,provider==='codex'?{type:'turn.completed'}:{type:'result',subtype:'success',result:'ok',session_id:id});close();});
  const r=await runNativeCli({...options,provider,persistent:true,resumeId:id},h);
  assert.equal(r.threadId,id);assert.ok(h.calls[0].args.includes(id));
  assert.ok(!h.calls[0].args.includes('--ephemeral'));assert.ok(!h.calls[0].args.includes('--no-session-persistence'));
  assert.ok(h.calls[0].args.includes(provider==='codex'?'resume':'--resume'));
 }
});
test('a mismatched resumed thread fails instead of silently replacing context',async()=>{
 const h=harness(({child,close})=>{line(child,{type:'thread.started',thread_id:'bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee'});line(child,{type:'turn.completed'});close();});
 const r=await runNativeCli({...options,provider:'codex',persistent:true,resumeId:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'},h);
 assert.equal(r.ok,false);assert.match(r.errors.join(' '),/different thread/);
});
