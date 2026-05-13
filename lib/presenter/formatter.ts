import { type HTMLElement as NHPElement, parse } from 'node-html-parser'
import { confidenceLabel, tierBadge } from './theme.js'

export interface RequirementEntry {
  title: string
  text: string
}

export type RequirementsRecord = Record<string, RequirementEntry>

export interface Requirements {
  minimum: RequirementsRecord
  recommended: RequirementsRecord
}

export interface GameData {
  name: string
  tier?: string
  confidence?: string
  protondbNotFound?: boolean
  objectID?: string | number
  releaseYear?: number
  oslist?: string[]
  userScore?: number
  followers?: number
  technologies?: string[]
  tags?: string[]
  pc_requirements?: {
    minimum?: string
    recommended?: string
  }
  requirements?: Requirements
  genres?: Array<{ description: string }>
  recommendations?: { total?: number }
  release_date?: { date?: string }
  developers?: unknown
  publishers?: unknown
}

function getValFromTier(tier: string): number {
  switch (tier) {
    case 'platinum':
      return 6
    case 'gold':
      return 5
    case 'silver':
      return 4
    case 'bronze':
      return 3
    case 'borked':
      return 2
    case 'pending':
      return 1
    default:
      return 0
  }
}

export function format(games: GameData[]): string[][] {
  const data = sortGames(games).map(formatGame)
  const header: string[][] = [['name', 'tier', 'confidence']]
  return header.concat(data)
}

export function sortGames(games: GameData[]): GameData[] {
  function compare(game1: GameData, game2: GameData): number {
    if (getValFromTier(game1.tier ?? '') > getValFromTier(game2.tier ?? ''))
      return -1
    if (getValFromTier(game2.tier ?? '') > getValFromTier(game1.tier ?? ''))
      return 1
    return 0
  }
  return games.sort(compare)
}

export function formatGame(game: GameData): string[] {
  if (game.protondbNotFound) {
    return [formatGameName(game.name), 'N/A', 'N/A']
  }
  return [
    formatGameName(game.name),
    tierBadge(game.tier),
    confidenceLabel(game.confidence)
  ]
}

export function formatGameName(name: string, limit = 35): string {
  if (name.length > limit) {
    return `${name.substring(0, limit)}...`
  }
  return name
}

export function wrapCollection(collection: unknown, width: number): string[] {
  if (!Array.isArray(collection)) {
    throw new Error('collection must be an array')
  }
  const lines: string[] = []
  let line = ''

  for (const item of collection as string[]) {
    if (line.length + item.length > width) {
      lines.push(line)
      line = ''
    }
    line += `${item},`
  }

  if (line.length > 0) {
    lines.push(line)
  }

  return lines
}

export function formatRequirements(game: Partial<GameData>): Requirements {
  function cleanText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
  }
  function getRequirements(root: NHPElement): RequirementsRecord {
    const requirements: RequirementsRecord = {}
    let requirementsRoot = root.querySelector('ul')?.firstChild as
      | NHPElement
      | null
      | undefined
    while (requirementsRoot) {
      const requirementTokens = requirementsRoot.text.split(':')
      if (requirementTokens.length > 1) {
        const key = cleanText(requirementTokens[0])
        const value = requirementTokens[1].trim()
        requirements[key] = {
          title: requirementTokens[0],
          text: value
        }
      }
      requirementsRoot = requirementsRoot.nextSibling as NHPElement | null
    }
    return requirements
  }
  const minimumData = game?.pc_requirements?.minimum
  const recommendedData = game?.pc_requirements?.recommended
  let minimum: RequirementsRecord = {}
  let recommended: RequirementsRecord = {}
  if (minimumData) {
    minimum = getRequirements(parse(minimumData))
  }
  if (recommendedData) {
    recommended = getRequirements(parse(recommendedData))
  }
  return {
    minimum,
    recommended
  }
}

export function generateRequirementsEntries(
  requirements: RequirementsRecord,
  data: string[][]
): string[][] {
  const keys = Object.keys(requirements)
  keys.forEach((key) => {
    const title = requirements?.[key].title
    const text = requirements?.[key].text
    data.push([`{bold}${title}{/bold}`, text])
  })
  return data
}
