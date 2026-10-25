// Native DSH tool adapter. The CLI owns routing/settings/accounting; DSH owns
// permissions, workspace, cancellation, output limits, and background jobs.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

export const name = 'dsh-model-routing';
export const inject = ['tools'];
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const operations = ['settings', 'call', 'batch', 'report'];
const efforts = ['default', 'off', 'low', 'medium', 'high', 'xhigh', 'max'];
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const properties = {
  operation: { type: 'string', enum: operations },
  model: { type: 'string', description: 'Exact explicitly selected model ID. Required except for report; never inferred from the chat model.' },
  prompt: { type: 'string', description: 'Single call prompt. Use promptFile for long prompts.' },
  promptFile: { type: 'string', description: 'Call text file, or batch JSONL file with {id,prompt} items; relative to the session workspace.' },
  route: { type: 'string', enum: ['local', 'external'], description: 'CLI transport lane; local means Ollama HTTP, including its explicitly allowed DeepSeek cloud model. external requires explicit user authorization.' },
  effort: { type: 'string', enum: efforts, description: 'Optional override. Omit to use per-model settings: exact DeepSeek 1017 defaults to Low.' },
  maxTokens: { type: 'integer', minimum: 1, description: 'Optional output override. Exact DeepSeek 1017 defaults to 65536; other models are unchanged.' },
  task: { type: 'string' },
  parallel: { type: 'integer', minimum: 1, maximum: 8, description: 'Batch concurrency; default 2, independent calls rather than subagents.' },
  out: { type: 'string', description: 'Optional batch results path.' },
  background: { type: 'boolean', description: 'Use DSH native jobs for a long call/batch. Inspect and cancel with job_output/job_kill.' },
};

export function commandFor(args, cliRoot = root) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Arguments must be an object.');
  for (const key of Object.keys(args)) if (!Object.hasOwn(properties, key)) throw new Error(`Unknown argument: ${key}`);
  if (!operations.includes(args.operation)) throw new Error('Unknown routing operation.');
  for (const key of ['model', 'prompt', 'promptFile', 'task', 'out']) {
    if (args[key] !== undefined && (typeof args[key] !== 'string' || !args[key].trim())) throw new Error(`${key} must be a nonempty string.`);
  }
  if (args.operation !== 'report' && !args.model) throw new Error('An explicit model is required.');
  if (args.route !== undefined && !['local', 'external'].includes(args.route)) throw new Error('Invalid route.');
  if (args.effort !== undefined && !efforts.includes(args.effort)) throw new Error('Invalid effort.');
  if (args.maxTokens !== undefined && (!Number.isSafeInteger(args.maxTokens) || args.maxTokens < 1)) throw new Error('Invalid maxTokens.');
  if (args.parallel !== undefined && (!Number.isInteger(args.parallel) || args.parallel < 1 || args.parallel > 8)) throw new Error('Invalid parallel.');
  if (args.background !== undefined && typeof args.background !== 'boolean') throw new Error('Invalid background.');
  if (args.operation === 'call' && Boolean(args.prompt) === Boolean(args.promptFile)) throw new Error('call needs exactly one of prompt or promptFile.');
  if (args.operation === 'batch' && (!args.promptFile || args.prompt)) throw new Error('batch needs promptFile, not prompt.');
  if (args.operation !== 'call' && args.route !== undefined) throw new Error('route is only valid for call.');
  if (args.operation !== 'batch' && (args.parallel !== undefined || args.out !== undefined)) throw new Error('parallel and out are only valid for batch.');
  if (!['call', 'batch'].includes(args.operation) && (args.prompt !== undefined || args.promptFile !== undefined || args.background)) throw new Error('Prompts/background require call or batch.');
  const words = ['&', quote(resolve(cliRoot, 'scripts', 'route.ps1')), args.operation];
  for (const [key, flag] of Object.entries({ model: 'Model', prompt: 'Prompt', promptFile: 'PromptFile', route: 'Route', effort: 'Effort', maxTokens: 'MaxTokens', task: 'Task', parallel: 'Parallel', out: 'Out' })) {
    if (args[key] !== undefined) words.push(`-${flag}`, quote(args[key]));
  }
  if (args.operation !== 'batch') words.push('-Json');
  const command = words.join(' ');
  if (command.length > 16000) throw new Error('Prompt too long for a Windows command; use promptFile.');
  return command;
}

export function apply(ctx, config = {}) {
  // Raw JSON schemas are part of the supported native registry contract. No
  // pinned SDK copy or node_modules path is needed by either host.
  ctx.tools.register({
    name: 'model_route',
    description: 'Explicit model call/batch and routing receipts through the retained CLI. Use only when requested/authorized; does not change normal chat, model picker or subagents. DeepSeek 1017 defaults Low/65536. Uses native pwsh permissions/jobs; no automatic retries.',
    parameters: { type: 'object', properties, required: ['operation'], additionalProperties: false },
    output: {
      schema: { type: 'object', properties: { operation: { type: 'string' }, native: {} }, required: ['operation', 'native'], additionalProperties: false },
      render: (_args, value) => value.native.content,
    },
    async execute(args, exec) {
      const command = commandFor(args, config.cliRoot ?? root);
      if (!ctx.tools.get('pwsh', exec.agent)) throw new Error('Native pwsh is unavailable in this preset; routing did not run.');
      const result = await ctx.tools.execute({
        name: 'pwsh', callId: `${exec.callId ?? 'routing'}-pwsh-${randomUUID()}`,
        rootCallId: exec.rootCallId ?? exec.callId,
        parent: exec, agent: exec.agent, signal: exec.signal,
        arguments: { description: `Run explicit model routing ${args.operation}`, command,
          ...(args.background ? { run_in_background: true } : {}) },
      });
      if (result.isError) throw new Error(result.content?.filter(b => b.type === 'text').map(b => b.text).join('\n') || 'Native pwsh denied or failed.');
      // Foreground nonzero exit is a canonical pwsh result, not isError.
      // Preserve it unchanged so failure is never represented as model success.
      return { operation: args.operation, native: result };
    },
  });
}
