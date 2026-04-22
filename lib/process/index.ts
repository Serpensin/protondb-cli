import type { Low } from 'lowdb'
import { oraPromise } from 'ora'
import { createCache } from '../cache/index.js'
import type { CacheData } from '../cache/index.js'
import getConfig from '../config/index.js'
import { getGamesReport } from '../core/index.js'
import type { GameData } from '../presenter/formatter.js'
import { presentData } from '../presenter/index.js'

export interface ProtondbCLIOptions {
  game: string | null
  verbose?: boolean
  hits: number
  concurrency: number
  disable_cache: boolean
  clear_cache: boolean
}

const config = getConfig()

export default async function start(
  protondbCLI: ProtondbCLIOptions,
  logger: Pick<Console, 'info'> = console
): Promise<void> {
  let cache: Low<CacheData> | null
  if (protondbCLI.disable_cache) {
    cache = null
  } else {
    cache = await createCache()
  }

  if (protondbCLI.clear_cache && cache) {
    if (protondbCLI.verbose) {
      logger.info('\n[INFO]Cleaning up local cache')
    }
    cache.data.etags = {}
    cache.data.games = {}
    await cache.write()
  }

  const algoliaUrl = config.DEFAULT_ALGOLIA_QUERY_URL
  const algoliaApiKey = Buffer.from(
    config.DEFAULT_X_ALGOLIA_API_KEY,
    'base64'
  ).toString('utf-8')
  const algoliaApplicationId = Buffer.from(
    config.DEFAULT_X_ALGOLIA_APPLICATION_ID,
    'base64'
  ).toString('utf-8')
  const protondbUrl = config.DEFAULT_PROTONDB_URL
  const query = protondbCLI.game
  const hitsPerPage = protondbCLI.hits
  const concurrency = protondbCLI.concurrency
  const verbose = protondbCLI.verbose
  const protondbProxyUrl = config.DEFAULT_PROTONDBPROXY_URL
  const options = {
    query: query ?? '',
    hitsPerPage,
    algoliaApiKey,
    algoliaApplicationId,
    algoliaUrl,
    protondbUrl,
    protondbProxyUrl,
    concurrency,
    verbose
  }
  const result = await oraPromise(getGamesReport(options, cache), {
    text: `fetching results for "${protondbCLI.game}"`
  })
  if (cache) {
    await cache.write()
  }
  presentData(result as unknown as GameData[])
}
