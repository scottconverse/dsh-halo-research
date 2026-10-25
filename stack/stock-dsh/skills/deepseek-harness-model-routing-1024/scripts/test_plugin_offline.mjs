// One focused offline integration suite: real DSH tool registry + real CLI,
// native shell replaced only at the process executor and loopback HTTP endpoint.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [hostPackage, cliRoot] = process.argv.slice(2);
if (!hostPackage || !cliRoot) throw new Error('Usage: node test_plugin_offline.mjs <host package.json> <CLI root>');
const host = createRequire(resolve(hostPackage));
const native = createRequire(host.resolve('@deepseek-ai/dsh-tool-terminal'));
const { ToolRuntime } = native('@deepseek-ai/dsh-tools');
const { Context } = native('@deepseek-ai/cordis');
const { apply, commandFor } = await import(pathToFileURL(join(cliRoot, 'plugin/index.mjs')));
const temp = await mkdtemp(join(tmpdir(), 'routing-plugin-offline-'));
const requests = [], executions = [];
let deny = false, shellRuns = 0;
const server = createServer(async (req, res) => {
  let text = ''; for await (const chunk of req) text += chunk;
  assert.equal(req.url, '/api/chat');
  const body = JSON.parse(text); requests.push(body);
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ model: body.model, message: { role: 'assistant', content: 'OFFLINE MOCK' }, done_reason: 'stop', prompt_eval_count: 11, eval_count: 7 }));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const ctx = new Context();
ctx.provide('systemPrompt', { tools() {} });
const toolFiber = ctx.plugin(ToolRuntime);
await toolFiber.await();
const signal = new AbortController().signal;
const exact = 'deepseek-v4.1-flash:1017-cloud';
try {
  ctx.tools.register({ name: 'pwsh', description: 'Offline executor for native adapter verification',
    parameters: { type: 'object' },
    output: { schema: {}, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute(args, exec) {
      executions.push({ args, exec });
      if (args.run_in_background) return { kind: 'background', jobId: 'OFFLINE-NO-PROCESS' };
      shellRuns++;
      return await new Promise((resolve, reject) => {
        const child = spawn('C:/Program Files/PowerShell/7/pwsh.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', args.command], {
          cwd: temp, windowsHide: true, signal: exec.signal,
          env: { ...process.env, OLLAMA_BASE: base, DSH_ROUTING_LEDGER: join(temp, 'ledger.jsonl') },
        });
        let stdout = '', stderr = '';
        child.stdout.on('data', b => { stdout += b; }); child.stderr.on('data', b => { stderr += b; });
        child.on('error', reject); child.on('close', exitCode => resolve({ kind: 'foreground', exitCode, stdout, stderr }));
      });
    },
  });
  ctx.tools.guard(exec => deny && exec.name === 'pwsh' ? 'Offline permission denial' : undefined);
  apply(ctx, { cliRoot });
  assert(ctx.tools.schemas().some(s => s.name === 'model_route'));
  const run = args => ctx.tools.execute({ name: 'model_route', callId: `offline-${executions.length}`, arguments: args, signal });
  const successful = async args => {
    const result = await run(args); assert.equal(result.isError, false, JSON.stringify(result));
    assert.equal(result.value.native.value.exitCode, 0, JSON.stringify(result.value.native)); return result;
  };
  const prompt = "Quote ' $literal `literal ; still only prompt data";
  await successful({ operation: 'call', model: exact, prompt });
  await writeFile(join(temp, 'items.jsonl'), '{"id":"one","prompt":"one"}\n{"id":"two","prompt":"two"}\n');
  await successful({ operation: 'batch', model: exact, promptFile: 'items.jsonl', parallel: 1, out: 'out.jsonl' });
  assert.equal(requests.length, 3);
  assert.equal(requests[0].messages[0].content, prompt);
  for (const req of requests) { assert.equal(req.think, 'low'); assert.equal(req.options.num_predict, 65536); assert(!('num_ctx' in req.options)); }
  await successful({ operation: 'batch', model: 'qwen3.8:27b-q4_K_M', promptFile: 'items.jsonl', parallel: 1 });
  for (const req of requests.slice(3)) { assert(!('think' in req)); assert(!('options' in req)); }
  const beforeBlock = requests.length;
  const blocked = await run({ operation: 'batch', model: 'kimi-k3:cloud', promptFile: 'items.jsonl' });
  assert.notEqual(blocked.value.native.value.exitCode, 0); assert.equal(requests.length, beforeBlock);
  await successful({ operation: 'settings', model: exact }); assert.equal(requests.length, beforeBlock);
  await successful({ operation: 'call', model: exact, prompt: 'override', effort: 'high', maxTokens: 17 });
  assert.equal(requests.at(-1).think, 'high'); assert.equal(requests.at(-1).options.num_predict, 17);
  const beforeDenied = shellRuns; deny = true;
  const denied = await run({ operation: 'call', model: exact, prompt: 'must not run' });
  assert.equal(denied.isError, true); assert.equal(shellRuns, beforeDenied); deny = false;
  const stopped = new AbortController(); stopped.abort();
  const cancelled = await ctx.tools.execute({ name: 'model_route', callId: 'cancelled', arguments: { operation: 'call', model: exact, prompt: 'must not run' }, signal: stopped.signal });
  assert.equal(cancelled.isError, true); assert.equal(shellRuns, beforeDenied);
  const background = await run({ operation: 'batch', model: exact, promptFile: 'items.jsonl', background: true });
  assert.equal(background.value.native.value.jobId, 'OFFLINE-NO-PROCESS'); assert.equal(shellRuns, beforeDenied);
  assert(executions.every(e => e.exec.parent?.name === 'model_route'));
  assert.throws(() => commandFor({ operation: 'call', model: exact, prompt: 'x', surprise: true }), /Unknown/);
  assert.throws(() => commandFor({ operation: 'call', prompt: 'x' }), /explicit model/);
  const ledger = (await readFile(join(temp, 'ledger.jsonl'), 'utf8')).trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(ledger.length, 6);
  assert(ledger.filter(r => r.requested_model === exact && r.max_tokens !== 17).every(r => r.effort === 'low' && r.max_tokens === 65536));
  console.log(JSON.stringify({ passed: true, nativeRegistry: true, plugin: 'model_route', mockRequests: requests.length,
    deepseekDefaultRequests: 3, defaultThink: 'low', defaultNumPredict: 65536,
    localUnchanged: true, otherCloudBlocked: true, overrides: true, permissionDeniedBeforeProcess: true,
    abortedBeforeProcess: true, nativeBackgroundForwarding: true, modelCalls: 0, ledgerRows: ledger.length }, null, 2));
} finally {
  await ctx.fiber.dispose(); await new Promise(resolve => server.close(resolve)); await rm(temp, { recursive: true, force: true });
}
