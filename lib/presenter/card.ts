import { formatRequirements, type GameData } from './formatter.js'
import { padRows } from './padder.js'
import {
  confidenceLabel,
  dim,
  fieldKey,
  sectionHeader,
  tierBadge,
  urlText
} from './theme.js'

function identitySection(game: GameData): string {
  const rows: Array<[string, string]> = [
    [
      fieldKey('Steam ID'),
      game.objectID != null ? String(game.objectID) : 'N/A'
    ],
    [
      fieldKey('Steam URL'),
      game.objectID != null
        ? urlText(`https://steamdb.info/app/${game.objectID}`)
        : 'N/A'
    ],
    [
      fieldKey('ProtonDB URL'),
      game.objectID != null
        ? urlText(`https://www.protondb.com/app/${game.objectID}`)
        : 'N/A'
    ],
    [fieldKey('Release date'), game.release_date?.date ?? 'N/A'],
    [
      fieldKey('Developers'),
      Array.isArray(game.developers) && game.developers.length > 0
        ? (game.developers as string[]).join(', ')
        : 'N/A'
    ],
    [
      fieldKey('Publishers'),
      Array.isArray(game.publishers) && game.publishers.length > 0
        ? (game.publishers as string[]).join(', ')
        : 'N/A'
    ]
  ]
  return `${sectionHeader('Identity')}\n${padRows(rows)}`
}

function compatibilitySection(game: GameData): string {
  const rows: Array<[string, string]> = [
    [fieldKey('Tier'), tierBadge(game.tier)],
    [fieldKey('Confidence'), confidenceLabel(game.confidence)],
    [fieldKey('OS'), game.oslist?.length ? game.oslist.join(', ') : 'N/A'],
    [
      fieldKey('User score'),
      game.userScore != null ? `${game.userScore}%` : 'N/A'
    ],
    [
      fieldKey('Recommendations'),
      game.recommendations?.total != null
        ? String(game.recommendations.total)
        : 'N/A'
    ]
  ]
  return `${sectionHeader('Compatibility')}\n${padRows(rows)}`
}

function metadataSection(game: GameData): string {
  const tags = game.tags?.length ? game.tags.join(', ') : 'N/A'
  const tech = game.technologies?.length ? game.technologies.join(', ') : 'N/A'
  const genres = game.genres?.length
    ? game.genres.map((entry) => entry.description).join(', ')
    : 'N/A'
  const rows: Array<[string, string]> = [
    [fieldKey('Tags'), tags],
    [fieldKey('Technologies'), tech],
    [fieldKey('Genres'), genres]
  ]
  return `${sectionHeader('Metadata')}\n${padRows(rows)}`
}

function requirementsSection(game: GameData): string | null {
  const reqs = game.requirements ?? formatRequirements(game)
  const minRows: Array<[string, string]> = Object.values(reqs.minimum).map(
    (entry) => [fieldKey(entry.title), entry.text]
  )
  const recRows: Array<[string, string]> = Object.values(reqs.recommended).map(
    (entry) => [fieldKey(entry.title), entry.text]
  )
  if (minRows.length === 0 && recRows.length === 0) return null
  const blocks: string[] = [sectionHeader('Requirements')]
  if (minRows.length > 0) {
    blocks.push(`${dim('Minimum')}\n${padRows(minRows)}`)
  }
  if (recRows.length > 0) {
    blocks.push(`${dim('Recommended')}\n${padRows(recRows)}`)
  }
  return blocks.join('\n')
}

export function formatCard(game: GameData): string {
  const sections: string[] = [
    fieldKey(game.name),
    identitySection(game),
    compatibilitySection(game),
    metadataSection(game)
  ]
  const reqs = requirementsSection(game)
  if (reqs) sections.push(reqs)
  return sections.join('\n\n')
}
