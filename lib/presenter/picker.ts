import { isCancel, select } from '@clack/prompts'
import type { GameData } from './formatter.js'
import { confidenceLabel, dim, tierBadge } from './theme.js'

export async function pickGame(games: GameData[]): Promise<GameData> {
  if (games.length === 0) {
    throw new Error('No games to pick from')
  }

  const options = games.map((game, index) => ({
    value: index,
    label: game.name,
    hint: game.protondbNotFound
      ? dim('no protondb data')
      : `${tierBadge(game.tier)} · ${confidenceLabel(game.confidence)}`
  }))

  const choice = await select({
    message: 'Pick a game',
    options
  })

  if (isCancel(choice)) {
    throw new Error('Picker cancelled')
  }

  return games[choice as number]
}
