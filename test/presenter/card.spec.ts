import assert from 'node:assert'
import { describe, test } from 'node:test'
import chalk from 'chalk'
import { formatCard } from '../../lib/presenter/card.js'
import {
  mergedGameDataComplete,
  mergedGameDataUncomplete
} from '../mock/index.mock.js'

chalk.level = 0

describe('formatCard', () => {
  test('contains the game name as a heading', () => {
    const out = formatCard(mergedGameDataComplete)
    assert.match(out, new RegExp(mergedGameDataComplete.name))
  })

  test('contains all section headings (Identity, Compatibility, Metadata)', () => {
    const out = formatCard(mergedGameDataComplete)
    assert.match(out, /Identity/)
    assert.match(out, /Compatibility/)
    assert.match(out, /Metadata/)
  })

  test('includes Steam and ProtonDB URLs when objectID is present', () => {
    const out = formatCard(mergedGameDataComplete)
    assert.match(out, /steamdb\.info\/app\//)
    assert.match(out, /protondb\.com\/app\//)
  })

  test('shows tier and confidence values', () => {
    const out = formatCard(mergedGameDataComplete)
    assert.match(out, new RegExp(mergedGameDataComplete.tier))
    assert.match(out, new RegExp(mergedGameDataComplete.confidence))
  })

  test('shows N/A for tier and confidence when protondb data missing', () => {
    const out = formatCard(mergedGameDataUncomplete)
    assert.match(out, /Tier\s+N\/A/)
    assert.match(out, /Confidence\s+N\/A/)
  })

  test('omits Requirements section when both minimum and recommended are empty', () => {
    const out = formatCard(mergedGameDataUncomplete)
    assert.equal(/Requirements/.test(out), false)
  })

  test('renders Requirements section when pc_requirements are present', () => {
    const game = {
      ...mergedGameDataComplete,
      pc_requirements: {
        minimum:
          '<strong>Minimum:</strong><ul><li><strong>OS:</strong> Linux</li><li><strong>Memory:</strong> 4GB</li></ul>',
        recommended:
          '<strong>Recommended:</strong><ul><li><strong>OS:</strong> Linux</li><li><strong>Memory:</strong> 8GB</li></ul>'
      }
    }
    const out = formatCard(game)
    assert.match(out, /Requirements/)
    assert.match(out, /Minimum/)
    assert.match(out, /Recommended/)
    assert.match(out, /4GB/)
    assert.match(out, /8GB/)
  })

  test('renders Requirements with only minimum when recommended is absent', () => {
    const game = {
      ...mergedGameDataComplete,
      pc_requirements: {
        minimum:
          '<strong>Minimum:</strong><ul><li><strong>OS:</strong> Linux</li></ul>'
      }
    }
    const out = formatCard(game)
    assert.match(out, /Requirements/)
    assert.match(out, /Minimum/)
    assert.equal(/Recommended/.test(out), false)
  })

  test('renders Requirements with only recommended when minimum is absent', () => {
    const game = {
      ...mergedGameDataComplete,
      pc_requirements: {
        recommended:
          '<strong>Recommended:</strong><ul><li><strong>OS:</strong> Linux</li></ul>'
      }
    }
    const out = formatCard(game)
    assert.match(out, /Requirements/)
    assert.match(out, /Recommended/)
    assert.equal(/Minimum\b/.test(out), false)
  })

  test('renders N/A for missing Identity, Compatibility, and Metadata fields', () => {
    const game = {
      name: 'Bare Game',
      protondbNotFound: true
    }
    const out = formatCard(game)
    assert.match(out, /Steam ID\s+N\/A/)
    assert.match(out, /Steam URL\s+N\/A/)
    assert.match(out, /ProtonDB URL\s+N\/A/)
    assert.match(out, /Release date\s+N\/A/)
    assert.match(out, /Developers\s+N\/A/)
    assert.match(out, /Publishers\s+N\/A/)
    assert.match(out, /OS\s+N\/A/)
    assert.match(out, /User score\s+N\/A/)
    assert.match(out, /Recommendations\s+N\/A/)
    assert.match(out, /Tags\s+N\/A/)
    assert.match(out, /Technologies\s+N\/A/)
    assert.match(out, /Genres\s+N\/A/)
  })

  test('joins genre descriptions with comma', () => {
    const game = {
      ...mergedGameDataComplete,
      genres: [{ description: 'RPG' }, { description: 'Action' }]
    }
    const out = formatCard(game)
    assert.match(out, /RPG, Action/)
  })

  test('shows recommendations total when present', () => {
    const game = {
      ...mergedGameDataComplete,
      recommendations: { total: 12345 }
    }
    const out = formatCard(game)
    assert.match(out, /12345/)
  })

  test('joins developers and publishers arrays with commas', () => {
    const game = {
      ...mergedGameDataComplete,
      developers: ['Bethesda Game Studios', 'Studio B'],
      publishers: ['Bethesda Softworks']
    }
    const out = formatCard(game)
    assert.match(out, /Bethesda Game Studios, Studio B/)
    assert.match(out, /Bethesda Softworks/)
  })

  test('shows N/A for empty developers/publishers arrays', () => {
    const game = {
      ...mergedGameDataComplete,
      developers: [],
      publishers: []
    }
    const out = formatCard(game)
    assert.match(out, /Developers\s+N\/A/)
    assert.match(out, /Publishers\s+N\/A/)
  })

  test('reads requirements directly when game.requirements is pre-populated', () => {
    const game = {
      ...mergedGameDataComplete,
      requirements: {
        minimum: {
          os: { title: 'OS', text: 'Linux' }
        },
        recommended: {}
      }
    }
    const out = formatCard(game)
    assert.match(out, /Requirements/)
    assert.match(out, /Minimum/)
    assert.match(out, /Linux/)
  })

  test('shows the release date when present', () => {
    const game = {
      ...mergedGameDataComplete,
      release_date: { date: '10 Nov, 2011' }
    }
    const out = formatCard(game)
    assert.match(out, /10 Nov, 2011/)
  })
})
