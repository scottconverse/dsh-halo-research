import { Agent, fetch as undiciFetch } from 'undici';

const agentsByTimeout = new Map();
const activeAgents = new Set();
const DEFAULT_SDK_TIMEOUT_MS = 600000;
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 300000;
const AGENT_TIMEOUT_MARGIN_MS = 1000;
let exitCleanupRegistered = false;

function positiveTimeout(value, fallback) {
	return Number.isFinite(value) && value > 0 ? Math.ceil(value) : fallback;
}

export function ollamaTimeoutAgentOptions(profile) {
	const sdkTimeoutMs = positiveTimeout(profile?.timeoutMs, DEFAULT_SDK_TIMEOUT_MS);
	const streamIdleTimeoutMs = positiveTimeout(profile?.streamIdleTimeoutMs, DEFAULT_STREAM_IDLE_TIMEOUT_MS);
	const transportTimeoutMs = Math.max(sdkTimeoutMs, streamIdleTimeoutMs) + AGENT_TIMEOUT_MARGIN_MS;
	return {
		headersTimeout: transportTimeoutMs,
		bodyTimeout: transportTimeoutMs
	};
}

function timeoutKey(options) {
	return `${options.headersTimeout}:${options.bodyTimeout}`;
}

function registerExitCleanup() {
	if (exitCleanupRegistered) return;
	exitCleanupRegistered = true;
	process.once('exit', () => {
		for (const entry of activeAgents) {
			try { entry.dispatcher.destroy(); } catch {}
		}
		activeAgents.clear();
		agentsByTimeout.clear();
	});
}

/**
 * Return a pi-ai-compatible fetch using the same Undici package as its Agent.
 * Agents are shared by timeout settings and implementation, never created per request.
 * The SDK timeout and pi-ai idle watchdog remain the effective user-facing limits;
 * Undici's transport limits sit just beyond both so they cannot cut those short.
 */
export function createOllamaTimeoutFetch(profile, dependencies = {}) {
	if (profile === null || typeof profile !== 'object')
		throw new TypeError('An Ollama provider profile is required to create its timeout fetch.');

	const AgentConstructor = dependencies.Agent ?? Agent;
	const fetchImpl = dependencies.fetch ?? undiciFetch;
	if (typeof AgentConstructor !== 'function' || typeof fetchImpl !== 'function')
		throw new TypeError('Ollama timeout fetch dependencies must provide an Agent constructor and fetch function.');
	const options = ollamaTimeoutAgentOptions(profile);
	const key = timeoutKey(options);
	let entries = agentsByTimeout.get(key);
	if (entries === undefined) {
		entries = [];
		agentsByTimeout.set(key, entries);
	}
	let entry = entries.find(candidate => candidate.AgentConstructor === AgentConstructor && candidate.fetchImpl === fetchImpl);
	if (entry === undefined) {
		const dispatcher = new AgentConstructor(options);
		const fetch = (input, init) => fetchImpl(input, { ...init, dispatcher });
		entry = { AgentConstructor, fetchImpl, dispatcher, fetch };
		entries.push(entry);
		activeAgents.add(entry);
		registerExitCleanup();
	}
	return entry.fetch;
}
