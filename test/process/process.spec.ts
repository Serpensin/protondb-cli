import assert from 'node:assert'
import { describe, test } from 'node:test'
import esmock from 'esmock'
import { mergedGames } from '../mock/index.mock.js'

interface RenderCall {
  data: unknown
  opts: { mode: string; isTty: boolean }
}

interface SpinnerLog {
  startCount: number
  stopCount: number
  lastStopArg?: string
}

async function loadStart(
  overrides: {
    render?: (data: unknown, opts: unknown) => Promise<void>
    spinner?: () => {
      start: (label?: string) => void
      stop: (label?: string) => void
    }
    getGamesReport?: () => Promise<unknown>
  } = {}
) {
  const mod = await esmock('../../lib/process/index.js', {
    '../../lib/core/index.js': {
      getGamesReport: overrides.getGamesReport ?? (async () => mergedGames)
    },
    '../../lib/cache/index.js': {
      createCache: async () => null
    },
    '../../lib/presenter/index.js': {
      render:
        overrides.render ??
        (async () => {
          /* noop */
        })
    },
    '@clack/prompts': {
      spinner:
        overrides.spinner ?? (() => ({ start: () => {}, stop: () => {} }))
    }
  })
  return mod.default as (
    opts: Record<string, unknown>,
    logger?: Pick<Console, 'info'>
  ) => Promise<void>
}

describe('start', () => {
  test('routes search results to render with summary mode by default', async () => {
    let renderCall: RenderCall | null = null
    const start = await loadStart({
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
      json: false
    })

    assert.ok(renderCall, 'render should be called')
    assert.equal((renderCall as RenderCall).opts.mode, 'summary')
    assert.deepEqual((renderCall as RenderCall).data, mergedGames)
  })

  test('routes to render with mode json when --json is set', async () => {
    let renderCall: RenderCall | null = null
    const start = await loadStart({
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

    assert.ok(renderCall, 'render should be called')
    assert.equal((renderCall as RenderCall).opts.mode, 'json')
    assert.deepEqual((renderCall as RenderCall).data, mergedGames)
  })

  test('skips the spinner when --json is set', async () => {
    const log: SpinnerLog = { startCount: 0, stopCount: 0 }
    const start = await loadStart({
      spinner: () => ({
        start: () => {
          log.startCount += 1
        },
        stop: () => {
          log.stopCount += 1
        }
      })
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

    assert.equal(log.startCount, 0, 'spinner.start should not be called')
    assert.equal(log.stopCount, 0, 'spinner.stop should not be called')
  })

  test('uses spinner on the default (summary, TTY) path', async () => {
    const originalIsTty = process.stdout.isTTY
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: true
    })
    const log: SpinnerLog = { startCount: 0, stopCount: 0 }
    try {
      const start = await loadStart({
        spinner: () => ({
          start: () => {
            log.startCount += 1
          },
          stop: () => {
            log.stopCount += 1
          }
        })
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
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {
        configurable: true,
        value: originalIsTty
      })
    }

    assert.equal(log.startCount, 1)
    assert.equal(log.stopCount, 1)
  })

  test('stops the spinner with "failed" when the fetch throws', async () => {
    const originalIsTty = process.stdout.isTTY
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: true
    })
    const stopArgs: string[] = []
    try {
      const start = await loadStart({
        getGamesReport: async () => {
          throw new Error('boom')
        },
        spinner: () => ({
          start: () => {},
          stop: (label?: string) => {
            if (label) stopArgs.push(label)
          }
        })
      })

      await assert.rejects(
        () =>
          start({
            game: 'fifa',
            verbose: false,
            hits: 5,
            concurrency: 2,
            disable_cache: true,
            clear_cache: false,
            json: false
          }),
        /boom/
      )
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {
        configurable: true,
        value: originalIsTty
      })
    }

    assert.deepEqual(stopArgs, ['failed'])
  })

  test('passes empty query when game is null', async () => {
    let receivedOptions: { query?: string } | null = null
    const start = await loadStart({
      getGamesReport: (async (options: { query: string }) => {
        receivedOptions = options
        return []
      }) as unknown as () => Promise<unknown>,
      render: async () => {}
    })

    await start({
      game: null,
      verbose: false,
      hits: 5,
      concurrency: 2,
      disable_cache: true,
      clear_cache: false,
      json: true
    })

    assert.equal((receivedOptions as { query: string } | null)?.query, '')
  })

  test('clears the cache when clear_cache is set', async () => {
    let writeCalls = 0
    const fakeCache = {
      data: {
        etags: { foo: 'bar' },
        games: { '1': { something: true } }
      },
      write: async () => {
        writeCalls += 1
      }
    }
    const mod = await esmock('../../lib/process/index.js', {
      '../../lib/core/index.js': {
        getGamesReport: async () => mergedGames
      },
      '../../lib/cache/index.js': {
        createCache: async () => fakeCache
      },
      '../../lib/presenter/index.js': {
        render: async () => {}
      },
      '@clack/prompts': {
        spinner: () => ({ start: () => {}, stop: () => {} })
      }
    })
    const start = mod.default as (
      opts: Record<string, unknown>,
      logger?: Pick<Console, 'info'>
    ) => Promise<void>

    const infoLogs: string[] = []
    await start(
      {
        game: 'fifa',
        verbose: true,
        hits: 5,
        concurrency: 2,
        disable_cache: false,
        clear_cache: true,
        json: true
      },
      {
        info: (msg: string) => {
          infoLogs.push(msg)
        }
      }
    )

    assert.deepEqual(fakeCache.data.etags, {})
    assert.deepEqual(fakeCache.data.games, {})
    assert.equal(
      writeCalls,
      2,
      'cache.write called once for clear and once for final'
    )
    assert.match(infoLogs.join(''), /Cleaning up local cache/)
  })
})
