import assert from 'node:assert'
import { describe, test } from 'node:test'
import chalk from 'chalk'
import { padKeyValue, padRows } from '../../lib/presenter/padder.js'

chalk.level = 0

describe('padKeyValue', () => {
  test('pads the key to the given width and joins with two spaces', () => {
    assert.equal(padKeyValue('Tier', 'platinum', 10), 'Tier        platinum')
  })

  test('does not truncate keys longer than the width', () => {
    assert.equal(padKeyValue('VeryLongKey', 'val', 5), 'VeryLongKey  val')
  })

  test('handles empty value', () => {
    assert.equal(padKeyValue('Tier', '', 4), 'Tier  ')
  })
})

describe('padRows', () => {
  test('finds the longest key and aligns all rows to it', () => {
    const result = padRows([
      ['Tier', 'platinum'],
      ['Confidence', 'strong'],
      ['OS', 'Linux']
    ])
    const lines = result.split('\n')
    assert.equal(lines.length, 3)
    assert.equal(lines[0], 'Tier        platinum')
    assert.equal(lines[1], 'Confidence  strong')
    assert.equal(lines[2], 'OS          Linux')
  })

  test('returns empty string for empty input', () => {
    assert.equal(padRows([]), '')
  })
})
