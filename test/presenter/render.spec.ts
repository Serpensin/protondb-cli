import assert from 'node:assert'
import { describe, test } from 'node:test'
import { render } from '../../lib/presenter/render.js'
import { mergedGameDataComplete, mergedGames } from '../mock/index.mock.js'

describe('render', () => {
  test('emits JSON via the writer when mode is json (array input)', async () => {
    const writes: string[] = []
    await render(mergedGames, {
      mode: 'json',
      isTty: true,
      write: (text: string) => writes.push(text)
    })
    const parsed = JSON.parse(writes.join(''))
    assert.ok(Array.isArray(parsed))
    assert.equal(parsed.length, mergedGames.length)
  })

  test('emits JSON for a single game when mode is json', async () => {
    const writes: string[] = []
    await render(mergedGameDataComplete, {
      mode: 'json',
      isTty: true,
      write: (text: string) => writes.push(text)
    })
    const parsed = JSON.parse(writes.join(''))
    assert.equal(parsed.name, mergedGameDataComplete.name)
  })

  test('appends a trailing newline after the JSON payload', async () => {
    const writes: string[] = []
    await render(mergedGameDataComplete, {
      mode: 'json',
      isTty: true,
      write: (text: string) => writes.push(text)
    })
    assert.ok(
      writes.join('').endsWith('\n'),
      'expected output to end with newline'
    )
  })

  test('throws on empty array input in json mode', async () => {
    await assert.rejects(
      () =>
        render([], {
          mode: 'json',
          isTty: true,
          write: () => {}
        }),
      /no games/i
    )
  })

  test('throws not-implemented for summary mode', async () => {
    await assert.rejects(
      () =>
        render(mergedGameDataComplete, {
          mode: 'summary',
          isTty: true,
          write: () => {}
        }),
      /not implemented/i
    )
  })

  test('throws not-implemented for card mode', async () => {
    await assert.rejects(
      () =>
        render(mergedGameDataComplete, {
          mode: 'card',
          isTty: true,
          write: () => {}
        }),
      /not implemented/i
    )
  })

  test('uses process.stdout.write when no writer is provided', async () => {
    const original = process.stdout.write.bind(process.stdout)
    const writes: string[] = []
    process.stdout.write = ((chunk: string | Uint8Array): boolean => {
      writes.push(typeof chunk === 'string' ? chunk : chunk.toString())
      return true
    }) as typeof process.stdout.write
    try {
      await render(mergedGameDataComplete, { mode: 'json', isTty: true })
    } finally {
      process.stdout.write = original
    }
    const parsed = JSON.parse(writes.join('').trim())
    assert.equal(parsed.name, mergedGameDataComplete.name)
  })
})
