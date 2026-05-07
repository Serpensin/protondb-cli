import type { GameData } from './formatter.js'
import { formatJson } from './json.js'
import { pickGame } from './picker.js'
import { formatSummary } from './summary.js'

export type RenderMode = 'summary' | 'card' | 'json'

export interface RenderOptions {
  mode: RenderMode
  isTty: boolean
  write?: (text: string) => void
}

const defaultWrite = (text: string): void => {
  process.stdout.write(text)
}

export async function render(
  data: GameData | GameData[],
  options: RenderOptions
): Promise<void> {
  const write = options.write ?? defaultWrite
  const isArray = Array.isArray(data)

  if (isArray && data.length === 0) {
    throw new Error('No games found')
  }

  if (options.mode === 'json') {
    write(formatJson(data))
    write('\n')
    return
  }

  if (!options.isTty) {
    const game = isArray ? data[0] : data
    write(formatJson(game))
    write('\n')
    return
  }

  const game = isArray ? await pickGame(data) : data

  if (options.mode === 'card') {
    throw new Error('render mode "card" not implemented')
  }

  write(formatSummary(game))
  write('\n')
}
