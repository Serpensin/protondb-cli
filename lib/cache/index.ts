import fs from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

export interface CacheData {
  etags: Record<string, string>
  games: Record<string, unknown>
}

const DEFAULT_PATH = join(os.homedir(), '.config', 'protondbcli')

export async function createCache(
  cacheFolder: string = DEFAULT_PATH
): Promise<Low<CacheData>> {
  await fs.promises.mkdir(cacheFolder, { recursive: true, mode: 0o775 })
  const protondbcliCacheFile = join(cacheFolder, 'protondb.cache.json')
  const adapter = new JSONFile<CacheData>(protondbcliCacheFile)
  const defaultData: CacheData = { etags: {}, games: {} }
  const cache = new Low<CacheData>(adapter, defaultData)
  return cache
}
