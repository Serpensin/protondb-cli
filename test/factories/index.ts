export interface MergedGameOptions {
  confidence: string
  tier: string
  name?: string
  lastUpdated?: number
  oslist?: string[]
  userScore?: number
  followers?: number
  technologies?: string[]
  releaseYear?: number
  tags?: string[]
  score?: number
}

export interface MergedGame {
  lastUpdated: number
  name: string
  oslist: string[]
  userScore: number
  followers: number
  technologies: string[]
  releaseYear: number
  tags: string[]
  objectID: string
  confidence: string
  tier: string
  score: number
}

const random = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min)) + min

const dtag = [
  'Strategy',
  'Action',
  'Survival',
  'FPS',
  'Classic',
  'Tactical',
  'Shooter',
  'PvP',
  'First-Person',
  'Multiplayer',
  'Competitive',
  'Old School',
  'Military',
  'Assassin',
  'eSports',
  'Score Attack',
  'Team-Based',
  "1990's",
  '1980s',
  'Nostalgia'
]

export function createMergedGame(opts: MergedGameOptions): MergedGame {
  if (!opts.confidence) throw new Error('mock game object needs confidence')
  if (!opts.tier) throw new Error('mock game object needs tier')
  return {
    lastUpdated: opts.lastUpdated ?? Date.now(),
    name: opts.name ?? `game ${Date.now()}`,
    oslist: opts.oslist ?? ['Windows', 'macOS', 'Linux', 'Steam Deck Playable'],
    userScore: opts.userScore ?? random(5.5, 98.5),
    followers: opts.followers ?? random(20, 9000),
    technologies: opts.technologies ?? [
      'Engine.GoldSource',
      'SDK.CEF',
      'SDK.Miles_Sound_System',
      'SDK.SDL'
    ],
    releaseYear: opts.releaseYear ?? random(1999, 2023),
    tags: opts.tags ?? dtag,
    objectID: `${random(1000, 5000)}`,
    confidence: opts.confidence,
    tier: opts.tier,
    score: opts.score ?? random(0.1, 10)
  }
}
