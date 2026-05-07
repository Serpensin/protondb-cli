import assert from 'node:assert'
import { describe, test } from 'node:test'
import chalk from 'chalk'
import { formatSummary } from '../../lib/presenter/summary.js'
import {
  mergedGameDataComplete,
  mergedGameDataUncomplete
} from '../mock/index.mock.js'

chalk.level = 0

describe('formatSummary', () => {
  test('contains the game name', () => {
    const out = formatSummary(mergedGameDataComplete)
    assert.match(out, new RegExp(mergedGameDataComplete.name))
  })

  test('shows tier and confidence labels', () => {
    const out = formatSummary(mergedGameDataComplete)
    assert.match(out, /Tier/)
    assert.match(out, new RegExp(mergedGameDataComplete.tier))
    assert.match(out, /Confidence/)
    assert.match(out, new RegExp(mergedGameDataComplete.confidence))
  })

  test('shows OS list', () => {
    const out = formatSummary(mergedGameDataComplete)
    assert.match(out, /OS/)
  })

  test('shows N/A for tier and confidence when protondb data missing', () => {
    const out = formatSummary(mergedGameDataUncomplete)
    const naCount = (out.match(/N\/A/g) || []).length
    assert.ok(naCount >= 2, 'expected at least 2 N/A occurrences')
  })

  test('shows N/A for OS when oslist is missing', () => {
    const out = formatSummary({ name: 'X' })
    assert.match(out, /OS\s+N\/A/)
  })

  test('shows N/A for Score when userScore is missing', () => {
    const out = formatSummary({ name: 'X' })
    assert.match(out, /Score\s+N\/A/)
  })

  test('produces no more than 8 lines', () => {
    const out = formatSummary(mergedGameDataComplete)
    const lineCount = out.split('\n').length
    assert.ok(lineCount <= 8, `expected <= 8 lines, got ${lineCount}`)
  })
})
