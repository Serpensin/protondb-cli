import type { GameData } from './formatter.js'
import { padRows } from './padder.js'
import { confidenceLabel, fieldKey, tierBadge } from './theme.js'

export function formatSummary(game: GameData): string {
  const rows: Array<[string, string]> = [
    [fieldKey('Tier'), tierBadge(game.tier)],
    [fieldKey('Confidence'), confidenceLabel(game.confidence)],
    [fieldKey('OS'), game.oslist?.join(', ') ?? 'N/A'],
    [fieldKey('Score'), game.userScore != null ? `${game.userScore}%` : 'N/A']
  ]
  return `${fieldKey(game.name)}\n${padRows(rows)}`
}
