import assert from 'node:assert'
import { describe, test } from 'node:test'
import esmock from 'esmock'
import { mergedGames } from '../mock/index.mock.js'

describe('pickGame', () => {
  test('invokes clack.select even for N=1 and returns that single game', async () => {
    let selectCalled = false
    const { pickGame } = await esmock('../../lib/presenter/picker.js', {
      '@clack/prompts': {
        select: async ({ options }: { options: Array<{ value: number }> }) => {
          selectCalled = true
          return options[0].value
        },
        isCancel: () => false
      }
    })

    const single = [mergedGames[0]]
    const picked = await pickGame(single)
    assert.ok(selectCalled, 'expected clack.select to be invoked even for N=1')
    assert.equal(picked, single[0])
  })

  test('returns the chosen game from the picker when N>1', async () => {
    const { pickGame } = await esmock('../../lib/presenter/picker.js', {
      '@clack/prompts': {
        select: async ({ options }: { options: Array<{ value: number }> }) =>
          options[1].value,
        isCancel: () => false
      }
    })

    const picked = await pickGame(mergedGames)
    assert.equal(picked, mergedGames[1])
  })

  test('uses dimmed "no protondb data" hint when protondbNotFound', async () => {
    let capturedOptions: Array<{
      value: number
      label: string
      hint: string
    }> | null = null
    const { pickGame } = await esmock('../../lib/presenter/picker.js', {
      '@clack/prompts': {
        select: async ({
          options
        }: {
          options: Array<{ value: number; label: string; hint: string }>
        }) => {
          capturedOptions = options
          return options[0].value
        },
        isCancel: () => false
      }
    })

    await pickGame(mergedGames)
    assert.ok(capturedOptions)
    const opts = capturedOptions as unknown as Array<{
      value: number
      label: string
      hint: string
    }>
    const naIndex = mergedGames.findIndex((game) => game.protondbNotFound)
    assert.match(opts[naIndex].hint, /no protondb data/)
  })

  test('throws when the user cancels', async () => {
    const cancelToken = Symbol('cancel')
    const { pickGame } = await esmock('../../lib/presenter/picker.js', {
      '@clack/prompts': {
        select: async () => cancelToken,
        isCancel: (value: unknown) => value === cancelToken
      }
    })
    await assert.rejects(() => pickGame(mergedGames), /cancel/i)
  })

  test('throws on empty input', async () => {
    const { pickGame } = await esmock('../../lib/presenter/picker.js', {
      '@clack/prompts': {
        select: async () => undefined,
        isCancel: () => false
      }
    })
    await assert.rejects(() => pickGame([]), /no games/i)
  })
})
