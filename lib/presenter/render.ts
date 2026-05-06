import type { GameData } from './formatter.js'
import { formatJson } from './json.js'

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

  if (Array.isArray(data) && data.length === 0) {
    throw new Error('No games found')
  }

  if (options.mode === 'json') {
    write(formatJson(data))
    write('\n')
    return
  }

  throw new Error(`render mode "${options.mode}" not implemented`)
}
