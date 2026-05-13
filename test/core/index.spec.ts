import assert from 'node:assert'
import { test } from 'node:test'
import esmock from 'esmock'
import sinon from 'sinon'
import {
  fetchAlgoliaMockedData,
  fetchProtondbMockedData,
  protondbProxyMock
} from '../mock/index.mock.js'

const algoliaUrl = 'https://94he6yatei-dsn.algolia.net/1/indexes/steamdb/query'
const algoliaApiKey = '9basom4fb297k3Y16cdaec8f5f257088f'
const algoliaApplicationId = '94HE6YATEI'
const protondbUrl = 'https://www.protondb.com/api/v1/reports/summaries'
const protondbProxyUrl = 'https://www.protondb.com/proxy/steam/api/appdetails'
const query = 'fifa'
const hitsPerPage = 5
const options = {
  query,
  hitsPerPage,
  algoliaApiKey,
  algoliaApplicationId,
  algoliaUrl,
  protondbUrl,
  protondbProxyUrl
}

test('getGamesReport must throw an error when Algolia API is not reachable', async () => {
  const core = await esmock('../../lib/core/index.js', {
    '../../lib/fetcher/index.js': {
      algoliaFetcher: () => {
        throw new Error('unreachable')
      }
    }
  })

  try {
    await core.getGamesReport(options)
    assert.fail('error is expected')
  } catch (error) {
    assert(error instanceof Error)
    assert.match(error.message, /unreachable/)
  }
})

test('getGamesReport must return an array of results always', async () => {
  const core = await esmock('../../lib/core/index.js', {
    '../../lib/fetcher/index.js': {
      algoliaFetcher: () => fetchAlgoliaMockedData,
      protondbFetcher: () => fetchProtondbMockedData,
      protondbProxyFetcher: () => null
    }
  })

  try {
    const games = await core.getGamesReport(options)
    assert(Array.isArray(games))
  } catch (_error) {
    assert.fail('error is not expected')
  }
})

test('getGamesReport must call the cache read method if the cache is a valid object', async () => {
  const core = await esmock('../../lib/core/index.js', {
    '../../lib/fetcher/index.js': {
      algoliaFetcher: () => fetchAlgoliaMockedData,
      protondbFetcher: () => fetchProtondbMockedData,
      protondbProxyFetcher: () => null
    }
  })
  const cache = { read: sinon.spy() }
  await core.getGamesReport(options, cache)
  assert(cache.read.calledOnce, 'cache read method is not being called')
})

test('getGamesReport must return an array of objects, the merge from algolia call + protondb call', async () => {
  const core = await esmock('../../lib/core/index.js', {
    '../../lib/fetcher/index.js': {
      algoliaFetcher: () => fetchAlgoliaMockedData,
      protondbFetcher: () => fetchProtondbMockedData,
      protondbProxyFetcher: () => null
    }
  })

  try {
    const games = await core.getGamesReport(options)
    assert(Array.isArray(games))
    games.forEach((game: Record<string, unknown>) => {
      assert(Object.hasOwn(game, 'lastUpdated'))
      assert(Object.hasOwn(game, 'name'))
      assert(Object.hasOwn(game, 'oslist'))
      assert(Object.hasOwn(game, 'userScore'))
      assert(Object.hasOwn(game, 'followers'))
      assert(Object.hasOwn(game, 'technologies'))
      assert(Object.hasOwn(game, 'releaseYear'))
      assert(Object.hasOwn(game, 'tags'))
      assert(Object.hasOwn(game, 'objectID'))
      assert(Object.hasOwn(game, 'bestReportedTier'))
      assert(Object.hasOwn(game, 'confidence'))
      assert(Object.hasOwn(game, 'score'))
      assert(Object.hasOwn(game, 'tier'))
      assert(Object.hasOwn(game, 'total'))
      assert(Object.hasOwn(game, 'trendingTier'))
    })
  } catch (_error) {
    assert.fail('error is not expected')
  }
})

test('getGamesReport must return an array of objects, the information from algolia with the key protondbNotFound as true and the tier and confidence as null when the protondb api returns a 404', async () => {
  const core = await esmock('../../lib/core/index.js', {
    '../../lib/fetcher/index.js': {
      algoliaFetcher: () => fetchAlgoliaMockedData,
      protondbFetcher: ({ objectId }: { objectId: string }) => {
        if (objectId === '1313860') {
          return null
        }
        return fetchProtondbMockedData
      },
      protondbProxyFetcher: () => null
    }
  })

  try {
    const games = await core.getGamesReport(options)
    assert(Array.isArray(games))
    Object.hasOwn(games[1], 'lastUpdated')
    Object.hasOwn(games[1], 'name')
    Object.hasOwn(games[1], 'oslist')
    Object.hasOwn(games[1], 'userScore')
    Object.hasOwn(games[1], 'followers')
    Object.hasOwn(games[1], 'technologies')
    Object.hasOwn(games[1], 'releaseYear')
    Object.hasOwn(games[1], 'tags')
    Object.hasOwn(games[1], 'objectID')
    Object.hasOwn(games[1], 'protondbNotFound')
    Object.hasOwn(games[1], 'tier')
    Object.hasOwn(games[1], 'confidence')
    assert.equal(games[1].tier, null)
    assert.equal(games[1].confidence, null)
    assert(games[1].protondbNotFound)
  } catch (_error) {
    assert.fail('error is not expected')
  }
})

test('getGamesReport must get data from the protondbProxy API, add it to the algolia + protondb response and include recommendations and genres as new properties', async () => {
  const core = await esmock('../../lib/core/index.js', {
    '../../lib/fetcher/index.js': {
      algoliaFetcher: () => fetchAlgoliaMockedData,
      protondbFetcher: () => fetchProtondbMockedData,
      protondbProxyFetcher: ({ appid }: { appid: number }) => {
        if (appid !== 72850) {
          return null
        }
        return protondbProxyMock
      }
    }
  })

  try {
    const games = await core.getGamesReport(options)
    assert(Array.isArray(games))
    Object.hasOwn(games[2], 'lastUpdated')
    Object.hasOwn(games[2], 'name')
    Object.hasOwn(games[2], 'oslist')
    Object.hasOwn(games[2], 'userScore')
    Object.hasOwn(games[2], 'followers')
    Object.hasOwn(games[2], 'technologies')
    Object.hasOwn(games[2], 'releaseYear')
    Object.hasOwn(games[2], 'tags')
    Object.hasOwn(games[2], 'objectID')
    Object.hasOwn(games[2], 'tier')
    Object.hasOwn(games[2], 'confidence')
    Object.hasOwn(games[2], 'recommendations')
    Object.hasOwn(games[2], 'genres')
  } catch (_error) {
    assert.fail('error is not expected')
  }
})
