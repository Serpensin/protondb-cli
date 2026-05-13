import assert from 'node:assert'
import { describe, test } from 'node:test'
import { formatJson } from '../../lib/presenter/json.js'
import { mergedGameDataComplete } from '../mock/index.mock.js'

describe('formatJson', () => {
  test('returns a single JSON object for a single game', () => {
    const out = formatJson(mergedGameDataComplete)
    const parsed = JSON.parse(out)
    assert.equal(parsed.name, mergedGameDataComplete.name)
    assert.equal(parsed.tier, mergedGameDataComplete.tier)
  })

  test('returns a JSON array for multiple games', () => {
    const out = formatJson([mergedGameDataComplete, mergedGameDataComplete])
    const parsed = JSON.parse(out)
    assert.ok(Array.isArray(parsed))
    assert.equal(parsed.length, 2)
  })

  test('output contains no ANSI escape sequences', () => {
    const out = formatJson(mergedGameDataComplete)
    // biome-ignore lint/suspicious/noControlCharactersInRegex: testing ANSI absence
    assert.equal(/\x1b\[/.test(out), false)
  })

  test('uses 2-space indentation', () => {
    const out = formatJson(mergedGameDataComplete)
    assert.ok(out.includes('\n  "'), 'expected 2-space indented keys')
  })
})
