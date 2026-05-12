import assert from 'node:assert'
import { describe, test } from 'node:test'
import chalk from 'chalk'
import {
  CONFIDENCE_NA,
  confidenceLabel,
  dim,
  fieldKey,
  sectionHeader,
  TIER_NA,
  tierBadge,
  urlText
} from '../../lib/presenter/theme.js'

chalk.level = 0

describe('tierBadge', () => {
  test('returns the tier name for a known tier', () => {
    assert.equal(tierBadge('platinum'), 'platinum')
    assert.equal(tierBadge('gold'), 'gold')
    assert.equal(tierBadge('silver'), 'silver')
    assert.equal(tierBadge('bronze'), 'bronze')
    assert.equal(tierBadge('borked'), 'borked')
    assert.equal(tierBadge('pending'), 'pending')
  })

  test('returns N/A for an unknown or empty tier', () => {
    assert.equal(tierBadge(''), TIER_NA)
    assert.equal(tierBadge(undefined), TIER_NA)
    assert.equal(tierBadge(null), TIER_NA)
    assert.equal(tierBadge('something-else'), TIER_NA)
  })
})

describe('confidenceLabel', () => {
  test('returns the confidence name for a known value', () => {
    assert.equal(confidenceLabel('strong'), 'strong')
    assert.equal(confidenceLabel('good'), 'good')
    assert.equal(confidenceLabel('moderate'), 'moderate')
    assert.equal(confidenceLabel('low'), 'low')
    assert.equal(confidenceLabel('inadequate'), 'inadequate')
  })

  test('returns N/A for an unknown or empty confidence', () => {
    assert.equal(confidenceLabel(''), CONFIDENCE_NA)
    assert.equal(confidenceLabel(undefined), CONFIDENCE_NA)
    assert.equal(confidenceLabel(null), CONFIDENCE_NA)
    assert.equal(confidenceLabel('not-a-thing'), CONFIDENCE_NA)
  })
})

describe('TIER_NA / CONFIDENCE_NA sentinels', () => {
  test('are plain strings (no blessed tags)', () => {
    assert.equal(TIER_NA, 'N/A')
    assert.equal(CONFIDENCE_NA, 'N/A')
  })
})

describe('text helpers', () => {
  test('fieldKey returns the input text (color disabled)', () => {
    assert.equal(fieldKey('Tier'), 'Tier')
  })

  test('dim returns the input text (color disabled)', () => {
    assert.equal(dim('Minimum'), 'Minimum')
  })

  test('sectionHeader returns the input text (color disabled)', () => {
    assert.equal(sectionHeader('Identity'), 'Identity')
  })

  test('urlText returns the input text (color disabled)', () => {
    assert.equal(urlText('https://example.com'), 'https://example.com')
  })
})
