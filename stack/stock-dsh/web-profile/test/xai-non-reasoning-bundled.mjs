import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const entry = process.argv[2]
if (entry === undefined || entry.length === 0) {
  throw new Error('usage: node test/xai-non-reasoning-bundled.mjs <path-to-dsh-xai-lib-index.js>')
}

const { materializeLiveModel } = await import(pathToFileURL(resolve(entry)).href)
assert.equal(typeof materializeLiveModel, 'function', 'bundled dsh-xai must export materializeLiveModel')

const template = {
  id: 'grok-4.6',
  name: 'Grok 4.6',
  api: 'openai-responses',
  provider: 'xai',
  baseUrl: 'https://api.x.ai/v1',
  reasoning: true,
  thinkingLevelMap: { off: null, low: 'low', medium: 'medium', high: 'high' },
  input: ['text', 'image'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 1_000_000,
  maxTokens: 30_000,
}

const nonReasoning = materializeLiveModel('grok-4.20-0309-non-reasoning', [template])
assert.equal(nonReasoning.id, 'grok-4.20-0309-non-reasoning')
assert.equal(nonReasoning.api, template.api, 'non-reasoning model retains response transport')
assert.deepEqual(nonReasoning.input, template.input, 'non-reasoning model retains input capability')
assert.equal(nonReasoning.reasoning, false, 'non-reasoning id must not advertise reasoning')
assert.equal('thinkingLevelMap' in nonReasoning, false, 'non-reasoning id must not inherit thinking dispatch')

const reasoning = materializeLiveModel('grok-4.20-0309-reasoning', [template])
assert.equal(reasoning.reasoning, true, 'reasoning sibling retains template reasoning')
assert.deepEqual(reasoning.thinkingLevelMap, template.thinkingLevelMap)

const compactNonReasoning = materializeLiveModel('grok-4.20-0309-nonreasoning', [template])
assert.equal(compactNonReasoning.reasoning, false, 'compact nonreasoning marker remains recognized')
assert.equal('thinkingLevelMap' in compactNonReasoning, false)

const falsePositive = materializeLiveModel('grok-4.20-0309-almostnon-reasoning', [template])
assert.equal(falsePositive.reasoning, true, 'embedded non-reasoning text must not lose reasoning metadata')
assert.deepEqual(falsePositive.thinkingLevelMap, template.thinkingLevelMap)

assert.strictEqual(materializeLiveModel('grok-4.6', [template]), template, 'exact catalog descriptor remains unchanged')
console.log('dsh-xai bundled non-reasoning metadata regression passed')