import type { GameData } from './formatter.js'

export function formatJson(data: GameData | GameData[]): string {
  return JSON.stringify(data, null, 2)
}
