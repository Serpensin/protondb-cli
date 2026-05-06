import assert from 'node:assert'
import { describe, test } from 'node:test'
import esmock from 'esmock'
import { mergedGames } from '../mock/index.mock.js'

interface RenderCall {
  data: unknown
  opts: { mode: string; isTty: boolean }
}

async function loadStart(
  overrides: {
    presentData?: (data: unknown) => void
    render?: (data: unknown, opts: unknown) => Promise<void>
    oraPromise?: <T>(promise: Promise<T>, options: unknown) => Promise<T>
  } = {}
) {
  const mod = await esmock('../../lib/process/index.js', {
    '../../lib/core/index.js': {
      getGamesReport: async () => mergedGames
    },
    '../../lib/cache/index.js': {
      createCache: async () => null
    },
    '../../lib/presenter/index.js': {
      presentData: overrides.presentData ?? (() => {}),
      render:
        overrides.render ??
        (async () => {
          /* noop */
        })
    },
    ora: {
      oraPromise:
        overrides.oraPromise ?? (async <T>(promise: Promise<T>) => promise)
    }
  })
  return mod.default as (
    opts: Record<string, unknown>,
    logger?: Pick<Console, 'info'>
  ) => Promise<void>
}

describe('start', () => {
  test('routes to render with mode json when --json is set', async () => {
    let renderCall: RenderCall | null = null
    let presentCalled = false
    const start = await loadStart({
      presentData: () => {
        presentCalled = true
      },
      render: async (data: unknown, opts: unknown) => {
        renderCall = { data, opts: opts as RenderCall['opts'] }
      }
    })

    await start({
      game: 'fifa',
      verbose: false,
      hits: 5,
      concurrency: 2,
      disable_cache: true,
      clear_cache: false,
      json: true
    })

    assert.equal(presentCalled, false, 'presentData should not be called')
    assert.ok(renderCall, 'render should be called')
    assert.equal((renderCall as RenderCall).opts.mode, 'json')
    assert.deepEqual((renderCall as RenderCall).data, mergedGames)
  })

  test('falls through to presentData (existing blessed path) when --json is absent', async () => {
    let renderCalled = false
    let presentArg: unknown = null
    const start = await loadStart({
      presentData: (data: unknown) => {
        presentArg = data
      },
      render: async () => {
        renderCalled = true
      }
    })

    await start({
      game: 'fifa',
      verbose: false,
      hits: 5,
      concurrency: 2,
      disable_cache: true,
      clear_cache: false,
      json: false
    })

    assert.equal(renderCalled, false, 'render should not be called')
    assert.deepEqual(presentArg, mergedGames)
  })

  test('skips the spinner (oraPromise) when --json is set', async () => {
    let oraCalled = false
    const start = await loadStart({
      oraPromise: async <T>(promise: Promise<T>): Promise<T> => {
        oraCalled = true
        return promise
      },
      render: async () => {}
    })

    await start({
      game: 'fifa',
      verbose: false,
      hits: 5,
      concurrency: 2,
      disable_cache: true,
      clear_cache: false,
      json: true
    })

    assert.equal(oraCalled, false, 'oraPromise should be skipped in json mode')
  })

  test('uses oraPromise on the default (non-json) path', async () => {
    let oraCalled = false
    const start = await loadStart({
      oraPromise: async <T>(promise: Promise<T>): Promise<T> => {
        oraCalled = true
        return promise
      },
      presentData: () => {}
    })

    await start({
      game: 'fifa',
      verbose: false,
      hits: 5,
      concurrency: 2,
      disable_cache: true,
      clear_cache: false,
      json: false
    })

    assert.equal(oraCalled, true)
  })
})
