import pMap from 'p-map'
import {
  algoliaFetcher,
  protondbFetcher,
  protondbProxyFetcher
} from '../fetcher/index.js'

export async function getGamesReport(queryOpts, cache = null) {
  const results = []
  const {
    query,
    hitsPerPage,
    algoliaApiKey,
    algoliaApplicationId,
    algoliaUrl,
    protondbUrl,
    protondbProxyUrl,
    concurrency,
    verbose
  } = queryOpts
  if (cache) {
    await cache.read()
  }
  const algoliaGames = await algoliaFetcher({
    query,
    hitsPerPage,
    algoliaApiKey,
    algoliaApplicationId,
    url: algoliaUrl
  })
  const mapper = async (game) => {
    const protondbGame = await protondbFetcher({
      query,
      objectId: game.objectID,
      url: protondbUrl,
      name: game.name,
      verbose,
      cache
    })
    const protondbProxyResponse = await protondbProxyFetcher({
      appid: game.objectID,
      url: protondbProxyUrl,
      verbose,
      cache
    })
    const protondbProxyGame = protondbProxyResponse?.[game.objectID]?.data
    if (protondbProxyGame) {
      return { ...protondbGame, ...protondbProxyGame }
    }
    return protondbGame
  }
  const protondbGames = await pMap(algoliaGames.hits, mapper, { concurrency })

  protondbGames.forEach((protondbGame, index) => {
    if (protondbGame?.tier && protondbGame.confidence) {
      results.push({ ...algoliaGames.hits[index], ...protondbGame })
    } else {
      results.push({
        ...algoliaGames.hits[index],
        ...{ protondbNotFound: true, tier: null, confidence: null }
      })
    }
  })

  return results
}
