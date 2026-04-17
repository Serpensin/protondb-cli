import assert from 'node:assert'
import fs from 'node:fs'
import { test } from 'node:test'
import { debugGameData, isValidGameName, isValidUrl } from '../lib/utils.js'

test('isValidUrl must throw an error when the url param is not a valid URL', () => {
  assert.throws(
    () => {
      isValidUrl(111 as unknown as string)
    },
    {
      name: 'TypeError',
      message: 'Invalid URL'
    }
  )

  assert.throws(
    () => {
      isValidUrl(false as unknown as string)
    },
    {
      name: 'TypeError',
      message: /Invalid URL/
    }
  )

  assert.throws(
    () => {
      isValidUrl({} as unknown as string)
    },
    {
      name: 'TypeError',
      message: /Invalid URL/
    }
  )

  assert.throws(
    () => {
      isValidUrl('some.random.string')
    },
    {
      name: 'TypeError',
      message: /Invalid URL/
    }
  )

  assert.throws(
    () => {
      isValidUrl('www.page.com')
    },
    {
      name: 'TypeError',
      message: /Invalid URL/
    }
  )

  assert.throws(
    () => {
      isValidUrl('ftp://some.ftp.server.com')
    },
    {
      name: 'Error',
      message: /Invalid url protocol/
    }
  )
})

test('isValidUrl must not throw an error when the url param is a valid URL', () => {
  assert.doesNotThrow(() => {
    isValidUrl('http://some.api.com')
  })

  assert.doesNotThrow(() => {
    isValidUrl('https://some.api.com')
  })
})

test('isValidGameName must throw an error when the game name is not a valid or empty string', () => {
  assert.throws(
    () => {
      isValidGameName(false)
    },
    {
      name: 'Error',
      message: /Invalid game name/
    }
  )

  assert.throws(
    () => {
      isValidGameName({})
    },
    {
      name: 'Error',
      message: /Invalid game name/
    }
  )

  assert.throws(
    () => {
      isValidGameName(null)
    },
    {
      name: 'Error',
      message: /Invalid game name/
    }
  )

  assert.throws(
    () => {
      isValidGameName(undefined)
    },
    {
      name: 'Error',
      message: /Invalid game name/
    }
  )
})

test('isValidGameName must not throw an error when the game name is a valid string', () => {
  assert.doesNotThrow(() => {
    isValidGameName('game1')
  })
})

test('debugGameData must write the game data to /tmp/debug.json', () => {
  const gameData = { name: 'test-game', id: 42 }
  debugGameData(gameData)
  const written = JSON.parse(
    fs.readFileSync('/tmp/debug.json', 'utf-8')
  ) as unknown
  assert.deepStrictEqual(written, gameData)
})
