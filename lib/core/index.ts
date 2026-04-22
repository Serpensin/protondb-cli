import type { Low } from 'lowdb'
import pMap from 'p-map'
import type { CacheData } from '../cache/index.js'
import {
  algoliaFetcher,
  protondbFetcher,
  protondbProxyFetcher
} from '../fetcher/index.js'

export interface AlgoliaGame {
  objectID: string
  name: string
  lastUpdated?: number
  oslist?: string[]
  userScore?: number
  followers?: number
  technologies?: string[]
  releaseYear?: number
  tags?: string[]
}

interface AlgoliaResponse {
  hits: AlgoliaGame[]
}

export interface GetGamesReportOptions {
  query: string
  hitsPerPage: number
  algoliaApiKey: string
  algoliaApplicationId: string
  algoliaUrl: string
  protondbUrl: string
  protondbProxyUrl: string
  concurrency?: number
  verbose?: boolean
}

export async function getGamesReport(
  queryOpts: GetGamesReportOptions,
  cache: Low<CacheData> | null = null
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = []
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
  const algoliaRaw = await algoliaFetcher({
    query,
    hitsPerPage,
    algoliaApiKey,
    algoliaApplicationId,
    url: algoliaUrl
  })
  const algoliaGames = algoliaRaw as AlgoliaResponse
  const mapper = async (
    game: AlgoliaGame
  ): Promise<Record<string, unknown> | null> => {
    const protondbGame = await protondbFetcher({
      query,
      objectId: game.objectID,
      url: protondbUrl,
      name: game.name,
      verbose,
      cache
    })
    const protondbProxyResponse = await protondbProxyFetcher({
      appid: Number(game.objectID),
      url: protondbProxyUrl,
      verbose,
      cache
    })
    const protondbProxyData = protondbProxyResponse as Record<
      string,
      { data: Record<string, unknown> }
    > | null
    const protondbProxyGame = protondbProxyData?.[game.objectID]?.data
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
