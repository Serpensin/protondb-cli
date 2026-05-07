import chalk from 'chalk'

export const TIER_NA = 'N/A'
export const CONFIDENCE_NA = 'N/A'

const TIER_COLORS: Record<string, (text: string) => string> = {
  platinum: chalk.hex('#E5E4E2'),
  gold: chalk.yellow,
  silver: chalk.hex('#C0C0C0'),
  bronze: chalk.hex('#cd7f32'),
  pending: chalk.magenta,
  borked: chalk.red
}

const CONFIDENCE_COLORS: Record<string, (text: string) => string> = {
  strong: chalk.hex('#AAFF00'),
  good: chalk.green,
  moderate: chalk.yellow,
  low: chalk.red,
  inadequate: chalk.hex('#8B0000')
}

export function tierBadge(tier: string | undefined | null): string {
  if (!tier) return TIER_NA
  const colorize = TIER_COLORS[tier]
  if (!colorize) return TIER_NA
  return colorize(tier)
}

export function confidenceLabel(confidence: string | undefined | null): string {
  if (!confidence) return CONFIDENCE_NA
  const colorize = CONFIDENCE_COLORS[confidence]
  if (!colorize) return CONFIDENCE_NA
  return colorize(confidence)
}

export function fieldKey(text: string): string {
  return chalk.bold(text)
}

export function dim(text: string): string {
  return chalk.dim(text)
}
