import assert from 'node:assert'
import { describe, test } from 'node:test'
import chalk from 'chalk'
import esmock from 'esmock'
import { render as directRender } from '../../lib/presenter/render.js'
import { mergedGameDataComplete, mergedGames } from '../mock/index.mock.js'

chalk.level = 0

async function loadRender(overrides: Record<string, unknown> = {}) {
  return esmock(
    '../../lib/presenter/render.js',
    {},
    {
      '@clack/prompts': {
        select: async ({
          options
        }: {
          options: Array<{ value: number }>
        }) => options[0].value,
        isCancel: () => false
      },
      ...overrides
    }
  )
}

describe('render', () => {
  test('emits JSON via the writer when mode is json (array input)', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
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
    const { render } = await loadRender()
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
    const { render } = await loadRender()
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
    const { render } = await loadRender()
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

  test('throws on empty array input in summary mode', async () => {
    const { render } = await loadRender()
    await assert.rejects(
      () =>
        render([], {
          mode: 'summary',
          isTty: true,
          write: () => {}
        }),
      /no games/i
    )
  })

  test('non-TTY auto-picks first match and emits JSON', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
    await render(mergedGames, {
      mode: 'summary',
      isTty: false,
      write: (text: string) => writes.push(text)
    })
    const parsed = JSON.parse(writes.join(''))
    assert.equal(parsed.name, mergedGames[0].name)
  })

  test('TTY summary mode runs the picker and emits the summary', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
    await render(mergedGames, {
      mode: 'summary',
      isTty: true,
      write: (text: string) => writes.push(text)
    })
    const out = writes.join('')
    assert.match(out, new RegExp(mergedGames[0].name))
    assert.match(out, /Tier/)
  })

  test('direct mode skips the picker and renders the single game summary', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
    await render(mergedGameDataComplete, {
      mode: 'summary',
      isTty: true,
      write: (text: string) => writes.push(text)
    })
    const out = writes.join('')
    assert.match(out, new RegExp(mergedGameDataComplete.name))
    assert.match(out, /Tier/)
  })

  test('non-TTY direct mode emits the single game as JSON', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
    await render(mergedGameDataComplete, {
      mode: 'summary',
      isTty: false,
      write: (text: string) => writes.push(text)
    })
    const parsed = JSON.parse(writes.join(''))
    assert.equal(parsed.name, mergedGameDataComplete.name)
  })

  test('TTY card mode runs the picker and emits the card', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
    await render(mergedGames, {
      mode: 'card',
      isTty: true,
      write: (text: string) => writes.push(text)
    })
    const out = writes.join('')
    assert.match(out, /Identity/)
    assert.match(out, /Compatibility/)
    assert.match(out, /Metadata/)
    assert.match(out, new RegExp(mergedGames[0].name))
  })

  test('TTY card mode renders single game without picker', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
    await render(mergedGameDataComplete, {
      mode: 'card',
      isTty: true,
      write: (text: string) => writes.push(text)
    })
    const out = writes.join('')
    assert.match(out, /Identity/)
    assert.match(out, new RegExp(mergedGameDataComplete.name))
  })

  test('uses process.stdout.write when no writer is provided', async () => {
    const original = process.stdout.write.bind(process.stdout)
    const writes: string[] = []
    process.stdout.write = ((chunk: string | Uint8Array): boolean => {
      writes.push(typeof chunk === 'string' ? chunk : chunk.toString())
      return true
    }) as typeof process.stdout.write
    try {
      await directRender(mergedGameDataComplete, {
        mode: 'json',
        isTty: true
      })
    } finally {
      process.stdout.write = original
    }
    const parsed = JSON.parse(writes.join('').trim())
    assert.equal(parsed.name, mergedGameDataComplete.name)
  })
})
