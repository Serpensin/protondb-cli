import assert from 'node:assert'
import { rmdir } from 'node:fs/promises'
import os from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, test } from 'node:test'
import { createCache } from '../../lib/cache/index.js'

const testCacheFolder = join(os.homedir(), '.config', 'protondbcli_test')

describe('cache', async () => {
  afterEach(async () => {
    await rmdir(testCacheFolder)
  })

  test('createCache method must return always a lowdb cache object which contains the data property with all the protondb-cli keys', async () => {
    const cache = await createCache(testCacheFolder)
    assert(
      Object.hasOwn(cache, 'data'),
      'cache does not have the data property'
    )
    assert(
      Object.hasOwn(cache.data, 'etags'),
      'cache data does not have the etags property'
    )
    assert(
      Object.hasOwn(cache.data, 'games'),
      'cache data does not have the games property'
    )
  })
})
