import assert from 'node:assert'
import getConfig from '../config/index.js'
import { getGamesReport } from './index.js'

const config = getConfig()

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
const protondbProxyUrl = config.DEFAULT_PROTONDBPROXY_URL

const query = (process.argv[2] as string | undefined) ?? 'fifa'
const hitsPerPage = Number(process.argv[3] ?? 10)

const options = {
  query,
  hitsPerPage,
  algoliaApiKey,
  algoliaApplicationId,
  algoliaUrl,
  protondbUrl,
  protondbProxyUrl
}
;(async () => {
  try {
    const result = await getGamesReport(options)
    assert(Array.isArray(result), 'failed to fetch from algolia or protondb')
    assert(result.length > 0, 'result set came empty')
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
})()
