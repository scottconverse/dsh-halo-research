import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

export const PATCHED_VERSION = '0.2.1-rc.2';
export const PRISTINE_SHA256 = '99B5C20830A52F69641DF8A18A39206079B0C725201958CCE2C4A934F1D4F7CD';
export const INVALID_TOOL_ARGUMENTS_CODE = 'INVALID_TOOL_ARGUMENTS';
export const REASONING_MARKER = 'Number.isFinite(usage.reasoning)';
export const ARGUMENTS_MARKER = 'cannot be replayed because its tool-call arguments';
export const OLLAMA_FETCH_MARKER = 'createOllamaTimeoutFetch(profile)';

const ollamaFetchUrl = new URL('./ollama-timeout-fetch.mjs', import.meta.url).href;

function block(lines) {
	return lines.join('\n');
}

const originalParseArguments = block([
	'/** Parse tool-call argument JSON; tolerate model malformations with {}. */',
	'function parseArguments(raw) {',
	'\ttry {',
	'\t\tconst parsed = JSON.parse(raw);',
	'\t\tif (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;',
	'\t} catch {}',
	'\treturn {};',
	'}',
	''
]);

const patchedParseArguments = block([
	'/** Parse tool-call argument JSON; malformed or non-object history stays loud instead of becoming {}. */',
	'function parseArguments(raw, context) {',
	'\tlet parsed;',
	'\ttry {',
	'\t\tparsed = JSON.parse(raw);',
	'\t} catch (error) {',
	'\t\tthrow new LlmError(`${context} cannot be replayed because its tool-call arguments are not valid JSON`, "INVALID_TOOL_ARGUMENTS");',
	'\t}',
	'\tif (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))',
	'\t\tthrow new LlmError(`${context} cannot be replayed because its tool-call arguments must be a JSON object`, "INVALID_TOOL_ARGUMENTS");',
	'\treturn parsed;',
	'}',
	''
]);

const originalForeignCallsite = block([
	'\t\t\tcontent.push({',
	'\t\t\t\ttype: "toolCall",',
	'\t\t\t\tid: block.id,',
	'\t\t\t\tname: block.name,',
	'\t\t\t\targuments: parseArguments(block.arguments)',
	'\t\t\t});'
]);

const patchedForeignCallsite = block([
	'\t\t\tcontent.push({',
	'\t\t\t\ttype: "toolCall",',
	'\t\t\t\tid: block.id,',
	'\t\t\t\tname: block.name,',
	'\t\t\t\targuments: parseArguments(block.arguments, `pi-ai chat history tool call ${block.name} (${block.id})`)',
	'\t\t\t});'
]);

const originalReplayCallsite = block([
	'\t\t\t\tcase "tool-call": return {',
	'\t\t\t\t\ttype: "toolCall",',
	'\t\t\t\t\tid: block.id,',
	'\t\t\t\t\tname: block.name,',
	'\t\t\t\t\targuments: parseArguments(block.arguments),'
]);

const patchedReplayCallsite = block([
	'\t\t\t\tcase "tool-call": return {',
	'\t\t\t\t\ttype: "toolCall",',
	'\t\t\t\t\tid: block.id,',
	'\t\t\t\t\tname: block.name,',
	'\t\t\t\t\targuments: parseArguments(block.arguments, `Replayed tool call ${block.name} (${block.id})`),'
]);

const originalMapUsage = block([
	'function mapUsage(usage) {',
	'\treturn {',
	'\t\tinputTokens: usage.input,',
	'\t\toutputTokens: usage.output,',
	'\t\ttotalTokens: usage.totalTokens,',
	'\t\t...usage.cacheRead > 0 ? { cacheReadTokens: usage.cacheRead } : {},',
	'\t\t...usage.cacheWrite > 0 ? { cacheWriteTokens: usage.cacheWrite } : {}',
	'\t};',
	'}'
]);

const patchedMapUsage = block([
	'function mapUsage(usage) {',
	'\treturn {',
	'\t\tinputTokens: usage.input,',
	'\t\toutputTokens: usage.output,',
	'\t\ttotalTokens: usage.totalTokens,',
	'\t\t...usage.cacheRead > 0 ? { cacheReadTokens: usage.cacheRead } : {},',
	'\t\t...usage.cacheWrite > 0 ? { cacheWriteTokens: usage.cacheWrite } : {},',
	'\t\t...Number.isFinite(usage.reasoning) && usage.reasoning > 0 ? { reasoningTokens: usage.reasoning } : {}',
	'\t};',
	'}'
]);

const originalOllamaImport = 'import { resolve } from "node:path";';
const patchedOllamaImport = block([
	originalOllamaImport,
	`import { createOllamaTimeoutFetch } from "${ollamaFetchUrl}";`
]);

const originalProfileOptionsFetch = '\t\t...profile.cacheRetention === void 0 ? {} : { cacheRetention: profile.cacheRetention },';
const patchedProfileOptionsFetch = block([
	originalProfileOptionsFetch,
	'\t\t...profile.provider === "ollama-local" ? { fetch: createOllamaTimeoutFetch(profile) } : {},'
]);

const PATCH_BLOCKS = [
	['Ollama transport import', originalOllamaImport, patchedOllamaImport],
	['Ollama profile fetch', originalProfileOptionsFetch, patchedProfileOptionsFetch],
	['parseArguments', originalParseArguments, patchedParseArguments],
	['pi-ai chat history tool call', originalForeignCallsite, patchedForeignCallsite],
	['replayed tool call', originalReplayCallsite, patchedReplayCallsite],
	['mapUsage', originalMapUsage, patchedMapUsage]
];

const PATCH_BLOCKS_WITH_PRESERVED_ANCHORS = new Set(['Ollama transport import', 'Ollama profile fetch']);

function normalize(source) {
	return source.replace(/\r\n/g, '\n');
}

function count(source, needle) {
	return needle.length === 0 ? 0 : source.split(needle).length - 1;
}

function blockApplied(source, label, original, patched) {
	return count(source, patched) === 1
		&& (PATCH_BLOCKS_WITH_PRESERVED_ANCHORS.has(label) || !source.includes(original));
}

function replaceExactlyOnce(source, from, to, label) {
	const matches = count(source, from);
	if (matches !== 1)
		throw new Error(`Unexpected @deepseek-ai/dsh-llm-pi-ai ${label} implementation (${matches} matches); refusing a blind patch.`);
	return source.replace(from, to);
}

function applyBlocks(source, present) {
	let next = source;
	for (const [label, original, patched] of PATCH_BLOCKS) {
		if (present(label, original, patched)) continue;
		next = replaceExactlyOnce(next, original, patched, label);
	}
	return next;
}

export function isFullyPatched(source) {
	const normalized = normalize(source);
	return PATCH_BLOCKS.every(([label, original, patched]) =>
		blockApplied(normalized, label, original, patched));
}

// Re-applies the exact expected patch over any prior deployment patch that used the
// original (v1) parseArguments signature. Because all anchors are exact, an already
// correct patched deployment yields byte-identical output, and drift is rejected.
export function patchSource(source) {
	const normalized = normalize(source);
	const alreadyPatched = PATCH_BLOCKS.filter(([label, original, patched]) =>
		blockApplied(normalized, label, original, patched));
	if (!isFullyPatched(normalized)) {
		const migrated = applyBlocks(normalized, (label, original, patched) =>
			blockApplied(normalized, label, original, patched));
		return migrated;
	}
	if (normalized.includes(ARGUMENTS_MARKER) || normalized.includes(REASONING_MARKER)) {
		if (alreadyPatched.length !== PATCH_BLOCKS.length)
			throw new Error('Partially patched @deepseek-ai/dsh-llm-pi-ai adapter; refusing to continue.');
	}
	return normalized;
}

export function locateAdapter(root = dirname(fileURLToPath(import.meta.url))) {
	const cli = createRequire(join(root, 'package.json')).resolve('@deepseek-ai/dsh/package.json');
	const adapter = createRequire(cli).resolve('@deepseek-ai/dsh-llm-pi-ai/package.json');
	const dir = dirname(adapter);
	const version = JSON.parse(readFileSync(adapter, 'utf8')).version;
	if (version !== PATCHED_VERSION)
		throw new Error(`Unreviewed @deepseek-ai/dsh-llm-pi-ai version ${version}; expected ${PATCHED_VERSION}.`);
	return { dir, target: join(dir, 'lib', 'index.js'), version };
}

export function ensureAdapterIntegrityPatch(root = dirname(fileURLToPath(import.meta.url))) {
	const { target, version } = locateAdapter(root);
	const before = readFileSync(target, 'utf8');
	const after = patchSource(before);
	const backupDir = join(root, 'runtime-patch-backups');
	const backup = join(backupDir, `dsh-llm-pi-ai-${version}-index.js.original`);
	const backupSource = existsSync(backup) ? readFileSync(backup, 'utf8') : before;
	const digest = createHash('sha256').update(backupSource).digest('hex').toUpperCase();
	if (digest !== PRISTINE_SHA256)
		throw new Error(`Pristine source expected ${PRISTINE_SHA256} but found ${digest}; refusing a blind patch.`);
	// Anchors alone cannot certify the remainder of an installed dependency.
	if (after !== patchSource(backupSource))
		throw new Error('Installed adapter differs from the reviewed complete patch; refusing unreviewed drift.');
	if (!existsSync(backup)) {
		mkdirSync(backupDir, { recursive: true });
		writeFileSync(backup, backupSource);
	}
	if (normalize(before) === after) return { changed: false, version };
	writeFileSync(target, after);
	const readback = readFileSync(target, 'utf8');
	if (!isFullyPatched(readback))
		throw new Error('Patch readback failed: expected patched blocks are not all present.');
	return { changed: true, version };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	console.log(JSON.stringify(ensureAdapterIntegrityPatch()));
}
