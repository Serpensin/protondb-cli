import { fetch } from 'undici'
import {
  buildHeaderRequest as algoliaHeaders,
  buildBodyRequest
} from './algolia.builder.js'
import {
  buildHeaderRequest as buildProtondbHeaders,
  buildUrl as buildProtondbUrl
} from './protondb.builder.js'
import { buildUrl as buildProtondbProxyUrl } from './protondbProxy.builder.js'

export interface FetcherCache {
  data: {
    etags: Record<string, unknown>
  }
}

export interface Logger {
  info(message: string): void
  warn(message: string): void
}

export interface AlgoliaFetcherParams {
  query?: string | null
  hitsPerPage?: number | null
  url?: string | null
  algoliaApiKey?: string | null
  algoliaApplicationId?: string | null
}

export interface ProtondbFetcherParams {
  query?: string | null
  objectId?: string | null
  url?: string | null
  name?: string | null
  verbose?: boolean
  cache?: FetcherCache | null
}

export interface ProtondbProxyFetcherParams {
  appid?: number | null
  url?: string | null
  verbose?: boolean
  cache?: FetcherCache | null
}

const NOT_MODIFIED = 304

export async function algoliaFetcher({
  query,
  hitsPerPage,
  url,
  algoliaApiKey,
  algoliaApplicationId
}: AlgoliaFetcherParams = {}): Promise<unknown> {
  if (!query) {
    throw new Error('query is required')
  }

  if (!url) {
    throw new Error('url is required')
  }

  if (!algoliaApiKey) {
    throw new Error('algoliaApiKey is required')
  }

  if (!algoliaApplicationId) {
    throw new Error('algoliaApplicationId is required')
  }

  const headers = algoliaHeaders({
    'x-algolia-api-key': algoliaApiKey,
    'x-algolia-application-id': algoliaApplicationId
  })
  const bodyPayload = buildBodyRequest({ query, hitsPerPage })
  const requestOpt = {
    headers,
    method: bodyPayload.method,
    body: JSON.stringify(bodyPayload.body)
  }
  const result = await fetch(url, requestOpt)
  if (!result.ok)
    throw new Error(`request for algolia failed with status ${result.status}`)
  return result.json()
}

export async function protondbFetcher(
  { query, objectId, url, name, verbose, cache }: ProtondbFetcherParams = {},
  logger: Logger = console
): Promise<Record<string, unknown> | null> {
  let cacheGame: Record<string, unknown> | null = null

  if (!query) {
    throw new Error('query is required')
  }

  if (!objectId) {
    throw new Error('objectId is required')
  }

  if (!url) {
    throw new Error('url is required')
  }

  if (cache?.data?.etags) {
    const entry = cache.data.etags[objectId]
    cacheGame = entry != null ? (entry as Record<string, unknown>) : null
  }

  const hasCacheEntry = cache && cacheGame

  try {
    const headers: Record<string, string> = buildProtondbHeaders(query)
    const requestOpt: { headers: Record<string, string> } = { headers }

    if (hasCacheEntry && cacheGame) {
      requestOpt.headers['If-None-Match'] = cacheGame.etag as string
    }

    const finalUrl = buildProtondbUrl(url, objectId)
    const result = await fetch(finalUrl, requestOpt)
    let game: Record<string, unknown>
    if (result.status === NOT_MODIFIED) {
      if (verbose) {
        logger.info(`\n[INFO]using cache for ${objectId}`)
      }
      game = cacheGame as Record<string, unknown>
    } else {
      if (!result.ok)
        throw new Error(
          `request for game ${name}(${objectId}) failed with status ${result.status}`
        )
      game = (await result.json()) as Record<string, unknown>
      if (cache) {
        game.etag = result.headers.get('etag')
        cache.data.etags[objectId] = game
      }
    }
    return game
  } catch (error) {
    if (verbose) {
      logger.warn(`\n[WARN][protondb] ${(error as Error).message}`)
    }
    return null
  }
}

export async function protondbProxyFetcher(
  { appid, url, verbose }: ProtondbProxyFetcherParams = {},
  logger: Logger = console
): Promise<unknown> {
  if (!appid) {
    throw new Error('appid is required')
  }

  if (!url) {
    throw new Error('url is required')
  }

  try {
    const finalUrl = buildProtondbProxyUrl(url, appid)
    const result = await fetch(finalUrl)
    if (!result.ok)
      throw new Error(
        `request for game ${appid} failed with status ${result.status}`
      )

    return result.json()
  } catch (error) {
    if (verbose) {
      logger.warn(`\n[WARN][protondbProxy] ${(error as Error).message}`)
    }
    return null
  }
}
