# CLI UI Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unmaintained `blessed` full-screen TUI with a coherent printed CLI experience: a clack picker for disambiguation, a tiered summary/detail card output, and structured JSON for non-TTY/scripting use.

**Architecture:** Drop the full-screen TUI model entirely. The presenter becomes a dispatcher that picks one of three renderers (json / summary / card) based on flags and TTY state. Pre-render disambiguation is handled by a clack `select` prompt. All output uses one visual system: `@clack/prompts` primitives (`note`, `log`, `spinner`) for boxed sections and lifecycle messages, plus `chalk` for inline color, plus a tiny in-repo padder for 2-column key/value alignment. Existing data-fetch layer (`lib/core`, `lib/fetcher`, `lib/cache`) is untouched except for one new `getGameById` core function used by `--game`.

**Tech Stack:**
- **Add:** `@clack/prompts`
- **Remove:** `blessed`, `@types/blessed`, `ora`
- **Keep:** `chalk` (already a dep), `yargs`, `node:test`, `esmock`, `c8`, `biome`, `husky` + commitlint
- TypeScript ESM, type-stripping via `tsx`, build via `tsc`

**Flag-naming note:** Existing `-v` / `--verbose` is wired to debug logging in `lib/process/index.ts` and is passed through to the fetchers — keep its semantics unchanged. The new "show full card" flag is therefore **`-d` / `--detail`**, not `-v`. This is a deliberate divergence from the brainstorming notes so we don't break existing verbose semantics.

**Commit style:** Conventional Commits with **lowercase** subject (husky/commitlint enforced in this repo, overrides the global "capitalize first letter" preference).

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `lib/presenter/theme.ts` | Single source of truth for tier/confidence color mapping, OS icons, badge rendering. Replaces blessed-tagged `formats.ts`. |
| `lib/presenter/padder.ts` | Tiny 2-column key/value alignment helper. ~30 LOC, no deps beyond `chalk`. |
| `lib/presenter/json.ts` | JSON renderer (machine output, no color, no spinner). |
| `lib/presenter/summary.ts` | 5-line summary renderer (default TTY output). |
| `lib/presenter/card.ts` | Full sectioned card renderer with `note`-bounded sections (`-d` / `--detail`). |
| `lib/presenter/picker.ts` | Clack `select` wrapper. Always shown for search results in TTY (even N=1); throws/auto-picks in non-TTY. |
| `lib/presenter/render.ts` | Top-level dispatcher. Decides picker→summary, picker→card, json, or direct-lookup variants based on flags + TTY. |

### Modified files

| File | Change |
|---|---|
| `lib/presenter/index.ts` | Re-export the new dispatcher (`render`) from `render.ts`. Keep `presentData` name as a thin wrapper for backward-compat with `lib/process/index.ts` callers, then update the caller. |
| `lib/presenter/formatter.ts` | Remove blessed-tagged returns from `formatGameTier` / `formatGameConfidence` / `format` / `formatGame`. Move those to `theme.ts`. Keep pure data-shaping helpers (`sortGames`, `formatGameName`, `wrapCollection`, `formatRequirements`, `generateRequirementsEntries`). |
| `lib/process/index.ts` | Replace `oraPromise` with clack `spinner()`; skip spinner entirely when `--json` or non-TTY. Pass new `detail`, `json`, `gameId` flags through to the presenter. |
| `protondb-cli.ts` | Add yargs options: `--game <id>`, `--detail` (alias `-d`), `--json`. |
| `lib/core/index.ts` | Add `getGameById(options)` for direct-lookup path. Bypasses Algolia, hits ProtonDB + ProtonDB-proxy by appid. |
| `package.json` | Drop `blessed`, `@types/blessed`, `ora`. Add `@clack/prompts`. |
| `test/presenter/formatter.spec.ts` | Update tests that asserted on blessed-tagged strings (`{gray-fg}N/A{/gray-fg}` etc.) — those assertions move to `test/presenter/theme.spec.ts` against the new plain/chalk output. |

### Deleted files

| File | Why |
|---|---|
| `lib/presenter/display.ts` | Blessed listtable detail view. Replaced by `card.ts`. |
| `lib/presenter/formats.ts` | Blessed tag-based formatting. Replaced by `theme.ts`. |

---

## Self-Test Convention

All renderers in `summary.ts`, `card.ts`, `json.ts` are **pure functions** — they take a `GameData` (or `GameData[]`) and return a string. They do NOT call `console.log`. The dispatcher in `render.ts` is the only place that writes to stdout. This makes everything trivially snapshot-testable without mocking I/O.

For tests that need predictable color output, use `chalk.level = 0` at the top of the spec to disable ANSI:

```typescript
import chalk from 'chalk'
chalk.level = 0
```

---

## Task 1: Add `@clack/prompts`, remove `blessed`/`@types/blessed`/`ora` from package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install new dep, uninstall old deps**

Run:
```bash
npm install --save @clack/prompts
npm uninstall blessed @types/blessed ora
```

Expected: `package.json` `dependencies` gains `@clack/prompts`, loses `blessed` and `ora`. `devDependencies` loses `@types/blessed`. `npm-shrinkwrap.json` regenerates.

- [ ] **Step 2: Verify the build still passes (it will fail at this point — that's expected)**

Run: `npm run build`

Expected: TypeScript errors in `lib/presenter/display.ts` and `lib/presenter/index.ts` (cannot find module 'blessed') and in `lib/process/index.ts` (cannot find 'ora'). This is intentional — we'll fix them in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add package.json npm-shrinkwrap.json
git commit -m "chore: swap blessed/ora deps for @clack/prompts"
```

---

## Task 2: Create `lib/presenter/theme.ts` with tier/confidence/OS color mapping

**Files:**
- Create: `lib/presenter/theme.ts`
- Test: `test/presenter/theme.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `test/presenter/theme.spec.ts`:

```typescript
import assert from 'node:assert'
import { describe, test } from 'node:test'
import chalk from 'chalk'
import {
  CONFIDENCE_NA,
  TIER_NA,
  confidenceLabel,
  tierBadge
} from '../../lib/presenter/theme.js'

chalk.level = 0

describe('tierBadge', () => {
  test('returns the tier name for a known tier', () => {
    assert.equal(tierBadge('platinum'), 'platinum')
    assert.equal(tierBadge('gold'), 'gold')
    assert.equal(tierBadge('silver'), 'silver')
    assert.equal(tierBadge('bronze'), 'bronze')
    assert.equal(tierBadge('borked'), 'borked')
    assert.equal(tierBadge('pending'), 'pending')
  })

  test('returns N/A for an unknown or empty tier', () => {
    assert.equal(tierBadge(''), TIER_NA)
    assert.equal(tierBadge(undefined), TIER_NA)
    assert.equal(tierBadge('something-else'), TIER_NA)
  })
})

describe('confidenceLabel', () => {
  test('returns the confidence name for a known value', () => {
    assert.equal(confidenceLabel('strong'), 'strong')
    assert.equal(confidenceLabel('good'), 'good')
    assert.equal(confidenceLabel('moderate'), 'moderate')
    assert.equal(confidenceLabel('low'), 'low')
    assert.equal(confidenceLabel('inadequate'), 'inadequate')
  })

  test('returns N/A for an unknown or empty confidence', () => {
    assert.equal(confidenceLabel(''), CONFIDENCE_NA)
    assert.equal(confidenceLabel(undefined), CONFIDENCE_NA)
  })
})

describe('TIER_NA / CONFIDENCE_NA sentinels', () => {
  test('are plain strings (no blessed tags)', () => {
    assert.equal(TIER_NA, 'N/A')
    assert.equal(CONFIDENCE_NA, 'N/A')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/theme.spec.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/presenter/theme.ts`:

```typescript
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

export function confidenceLabel(
  confidence: string | undefined | null
): string {
  if (!confidence) return CONFIDENCE_NA
  const colorize = CONFIDENCE_COLORS[confidence]
  if (!colorize) return CONFIDENCE_NA
  return colorize(confidence)
}

export function sectionHeader(text: string): string {
  return chalk.bold.cyan(text)
}

export function fieldKey(text: string): string {
  return chalk.bold(text)
}

export function dim(text: string): string {
  return chalk.dim(text)
}

export function urlText(text: string): string {
  return chalk.underline.blue(text)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/theme.spec.ts`

Expected: PASS — all tests in `tierBadge`, `confidenceLabel`, `TIER_NA / CONFIDENCE_NA sentinels` describe blocks succeed.

- [ ] **Step 5: Commit**

```bash
git add lib/presenter/theme.ts test/presenter/theme.spec.ts
git commit -m "feat(presenter): add theme module for tier/confidence colors"
```

---

## Task 3: Create `lib/presenter/padder.ts` 2-column alignment helper

**Files:**
- Create: `lib/presenter/padder.ts`
- Test: `test/presenter/padder.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `test/presenter/padder.spec.ts`:

```typescript
import assert from 'node:assert'
import { describe, test } from 'node:test'
import chalk from 'chalk'
import { padKeyValue, padRows } from '../../lib/presenter/padder.js'

chalk.level = 0

describe('padKeyValue', () => {
  test('pads the key to the given width and joins with two spaces', () => {
    assert.equal(padKeyValue('Tier', 'platinum', 10), 'Tier        platinum')
  })

  test('does not truncate keys longer than the width', () => {
    assert.equal(
      padKeyValue('VeryLongKey', 'val', 5),
      'VeryLongKey  val'
    )
  })

  test('handles empty value', () => {
    assert.equal(padKeyValue('Tier', '', 4), 'Tier  ')
  })
})

describe('padRows', () => {
  test('finds the longest key and aligns all rows to it', () => {
    const result = padRows([
      ['Tier', 'platinum'],
      ['Confidence', 'strong'],
      ['OS', 'Linux']
    ])
    const lines = result.split('\n')
    assert.equal(lines.length, 3)
    assert.equal(lines[0], 'Tier        platinum')
    assert.equal(lines[1], 'Confidence  strong')
    assert.equal(lines[2], 'OS          Linux')
  })

  test('returns empty string for empty input', () => {
    assert.equal(padRows([]), '')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/padder.spec.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/presenter/padder.ts`:

```typescript
const SEPARATOR = '  '

export function padKeyValue(
  key: string,
  value: string,
  width: number
): string {
  return `${key.padEnd(width, ' ')}${SEPARATOR}${value}`
}

export function padRows(rows: Array<[string, string]>): string {
  if (rows.length === 0) return ''
  const widest = rows.reduce(
    (max, [key]) => (key.length > max ? key.length : max),
    0
  )
  return rows
    .map(([key, value]) => padKeyValue(key, value, widest))
    .join('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/padder.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/presenter/padder.ts test/presenter/padder.spec.ts
git commit -m "feat(presenter): add 2-column key/value padder helper"
```

---

## Task 4: Create `lib/presenter/json.ts` JSON renderer

**Files:**
- Create: `lib/presenter/json.ts`
- Test: `test/presenter/json.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `test/presenter/json.spec.ts`:

```typescript
import assert from 'node:assert'
import { describe, test } from 'node:test'
import { formatJson } from '../../lib/presenter/json.js'
import { mergedGameDataComplete } from '../mock/index.mock.js'

describe('formatJson', () => {
  test('returns a single JSON object for a single game', () => {
    const out = formatJson(mergedGameDataComplete)
    const parsed = JSON.parse(out)
    assert.equal(parsed.name, mergedGameDataComplete.name)
    assert.equal(parsed.tier, mergedGameDataComplete.tier)
  })

  test('returns a JSON array for multiple games', () => {
    const out = formatJson([mergedGameDataComplete, mergedGameDataComplete])
    const parsed = JSON.parse(out)
    assert.ok(Array.isArray(parsed))
    assert.equal(parsed.length, 2)
  })

  test('output contains no ANSI escape sequences', () => {
    const out = formatJson(mergedGameDataComplete)
    // biome-ignore lint/suspicious/noControlCharactersInRegex: testing ANSI absence
    assert.equal(/\[/.test(out), false)
  })

  test('uses 2-space indentation', () => {
    const out = formatJson(mergedGameDataComplete)
    assert.ok(out.includes('\n  "'), 'expected 2-space indented keys')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/json.spec.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/presenter/json.ts`:

```typescript
import type { GameData } from './formatter.js'

export function formatJson(data: GameData | GameData[]): string {
  return JSON.stringify(data, null, 2)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/json.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/presenter/json.ts test/presenter/json.spec.ts
git commit -m "feat(presenter): add json renderer"
```

---

## Task 5: Create `lib/presenter/summary.ts` 5-line summary renderer

**Files:**
- Create: `lib/presenter/summary.ts`
- Test: `test/presenter/summary.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `test/presenter/summary.spec.ts`:

```typescript
import assert from 'node:assert'
import { describe, test } from 'node:test'
import chalk from 'chalk'
import { formatSummary } from '../../lib/presenter/summary.js'
import {
  mergedGameDataComplete,
  mergedGameDataUncomplete
} from '../mock/index.mock.js'

chalk.level = 0

describe('formatSummary', () => {
  test('contains the game name', () => {
    const out = formatSummary(mergedGameDataComplete)
    assert.match(out, new RegExp(mergedGameDataComplete.name))
  })

  test('shows tier and confidence labels', () => {
    const out = formatSummary(mergedGameDataComplete)
    assert.match(out, /Tier/)
    assert.match(out, new RegExp(mergedGameDataComplete.tier))
    assert.match(out, /Confidence/)
    assert.match(out, new RegExp(mergedGameDataComplete.confidence))
  })

  test('shows OS list', () => {
    const out = formatSummary(mergedGameDataComplete)
    assert.match(out, /OS/)
  })

  test('shows N/A for tier and confidence when protondb data missing', () => {
    const out = formatSummary(mergedGameDataUncomplete)
    const naCount = (out.match(/N\/A/g) || []).length
    assert.ok(naCount >= 2, 'expected at least 2 N/A occurrences')
  })

  test('produces no more than 8 lines', () => {
    const out = formatSummary(mergedGameDataComplete)
    const lineCount = out.split('\n').length
    assert.ok(lineCount <= 8, `expected <= 8 lines, got ${lineCount}`)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/summary.spec.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/presenter/summary.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/summary.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/presenter/summary.ts test/presenter/summary.spec.ts
git commit -m "feat(presenter): add summary renderer"
```

---

## Task 6: Create `lib/presenter/card.ts` sectioned card renderer

**Files:**
- Create: `lib/presenter/card.ts`
- Test: `test/presenter/card.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `test/presenter/card.spec.ts`:

```typescript
import assert from 'node:assert'
import { describe, test } from 'node:test'
import chalk from 'chalk'
import { formatCard } from '../../lib/presenter/card.js'
import {
  mergedGameDataComplete,
  mergedGameDataUncomplete
} from '../mock/index.mock.js'

chalk.level = 0

describe('formatCard', () => {
  test('contains the game name as a heading', () => {
    const out = formatCard(mergedGameDataComplete)
    assert.match(out, new RegExp(mergedGameDataComplete.name))
  })

  test('contains all four section headings', () => {
    const out = formatCard(mergedGameDataComplete)
    assert.match(out, /Identity/)
    assert.match(out, /Compatibility/)
    assert.match(out, /Metadata/)
  })

  test('includes Steam and ProtonDB URLs', () => {
    const out = formatCard(mergedGameDataComplete)
    assert.match(out, /steamdb\.info\/app\//)
    assert.match(out, /protondb\.com\/app\//)
  })

  test('shows tier and confidence', () => {
    const out = formatCard(mergedGameDataComplete)
    assert.match(out, new RegExp(mergedGameDataComplete.tier))
    assert.match(out, new RegExp(mergedGameDataComplete.confidence))
  })

  test('shows N/A for tier when protondb data missing', () => {
    const out = formatCard(mergedGameDataUncomplete)
    assert.match(out, /N\/A/)
  })

  test('omits Requirements section when neither minimum nor recommended is present', () => {
    const out = formatCard(mergedGameDataUncomplete)
    assert.equal(/Requirements/.test(out), false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/card.spec.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/presenter/card.ts`:

```typescript
import {
  type GameData,
  formatRequirements
} from './formatter.js'
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
    [fieldKey('Steam ID'), String(game.objectID ?? 'N/A')],
    [
      fieldKey('Steam URL'),
      game.objectID
        ? urlText(`https://steamdb.info/app/${game.objectID}`)
        : 'N/A'
    ],
    [
      fieldKey('ProtonDB URL'),
      game.objectID
        ? urlText(`https://www.protondb.com/app/${game.objectID}`)
        : 'N/A'
    ],
    [fieldKey('Release date'), game.release_date?.date ?? 'N/A'],
    [fieldKey('Developers'), String(game.developers ?? 'N/A')],
    [fieldKey('Publishers'), String(game.publishers ?? 'N/A')]
  ]
  return `${sectionHeader('Identity')}\n${padRows(rows)}`
}

function compatibilitySection(game: GameData): string {
  const rows: Array<[string, string]> = [
    [fieldKey('Tier'), tierBadge(game.tier)],
    [fieldKey('Confidence'), confidenceLabel(game.confidence)],
    [fieldKey('OS'), game.oslist?.join(', ') ?? 'N/A'],
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
  const tech = game.technologies?.length
    ? game.technologies.join(', ')
    : 'N/A'
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
  const minRows: Array<[string, string]> = Object.values(
    reqs.minimum ?? {}
  ).map((entry) => [fieldKey(entry.title), entry.text])
  const recRows: Array<[string, string]> = Object.values(
    reqs.recommended ?? {}
  ).map((entry) => [fieldKey(entry.title), entry.text])
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/card.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/presenter/card.ts test/presenter/card.spec.ts
git commit -m "feat(presenter): add sectioned card renderer"
```

---

## Task 7: Strip blessed tags from `formatter.ts`, move tier/confidence formatting to theme

**Files:**
- Modify: `lib/presenter/formatter.ts`
- Modify: `test/presenter/formatter.spec.ts`

- [ ] **Step 1: Update the failing tests in `test/presenter/formatter.spec.ts`**

Replace the existing `formatGameTier`, `formatGameConfidence`, and `formatGame` tests in `test/presenter/formatter.spec.ts` (the assertions on `{gray-fg}N/A{/gray-fg}` and the `Symbol(...)` lookups). The new contract: `formatGame` returns `[name, tier, confidence]` as plain or chalk-colored strings, with `'N/A'` (no blessed tags) when protondb data is missing.

The relevant blocks to update:

```typescript
// REPLACE the existing 'formatGame' describe block with:
describe('formatGame', () => {
  test('formatGame returns [name, tier, confidence] as plain strings (chalk.level=0)', () => {
    chalk.level = 0
    const result = formatGame(mergedGameDataComplete)
    assert.equal(result[0], formatGameName(mergedGameDataComplete.name))
    assert.equal(result[1], mergedGameDataComplete.tier)
    assert.equal(result[2], mergedGameDataComplete.confidence)
  })

  test('returns N/A (no blessed tags) when protondb data is missing', () => {
    chalk.level = 0
    const result = formatGame(mergedGameDataUncomplete)
    assert.equal(result[1], 'N/A')
    assert.equal(result[2], 'N/A')
  })
})
```

Add `import chalk from 'chalk'` at the top of the spec file.

Remove the imports of `GAME_NA`, `TAG_CONFIDENCE`, `TAG_TIERS`, `formatGameConfidence`, `formatGameTier` from `lib/presenter/formats.js` and `lib/presenter/formatter.js` — those functions no longer exist on `formatter`. They're available on `theme.ts` but tested separately.

Remove any other tests in this file that import from `formats.js` or that assert on blessed-tagged output. Examples:
- A test asserting `formatGameTier('platinum') === Symbol(PLATINUM_TIER).description` — DELETE.
- A test asserting `formatGameConfidence('strong') === Symbol(STRONG_CONFIDENCE).description` — DELETE.
- A test asserting `GAME_NA === '{gray-fg}N/A{/gray-fg}'` — DELETE.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/formatter.spec.ts`

Expected: FAIL — `formatGame` still returns blessed-tagged output, not plain `'N/A'`.

- [ ] **Step 3: Update `lib/presenter/formatter.ts`**

Edit `lib/presenter/formatter.ts`:

1. Remove the import of `GAME_NA`, `TAG_CONFIDENCE`, `TAG_TIERS` from `./formats.js`.
2. Add `import { confidenceLabel, tierBadge } from './theme.js'`.
3. Replace `formatGame` body:

```typescript
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
```

4. Delete the `formatGameTier` and `formatGameConfidence` exported functions (their behavior now lives in `theme.ts`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/formatter.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/presenter/formatter.ts test/presenter/formatter.spec.ts
git commit -m "refactor(presenter): replace blessed tags with chalk via theme module"
```

---

## Task 8: Create `lib/presenter/picker.ts` clack `select` wrapper

**Files:**
- Create: `lib/presenter/picker.ts`
- Test: `test/presenter/picker.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `test/presenter/picker.spec.ts`:

```typescript
import assert from 'node:assert'
import { describe, test } from 'node:test'
import esmock from 'esmock'
import { mergedGames } from '../mock/index.mock.js'

describe('pickGame', () => {
  test('returns the only game directly when N=1 (still surfaces picker for confirmation)', async () => {
    let selectCalled = false
    const { pickGame } = await esmock(
      '../../lib/presenter/picker.js',
      {
        '@clack/prompts': {
          select: async ({ options }: { options: Array<{ value: number }> }) => {
            selectCalled = true
            return options[0].value
          },
          isCancel: () => false
        }
      }
    )

    const single = [mergedGames[0]]
    const picked = await pickGame(single)
    assert.ok(selectCalled, 'expected clack.select to be invoked even for N=1')
    assert.equal(picked, single[0])
  })

  test('returns the chosen game from the picker when N>1', async () => {
    const { pickGame } = await esmock(
      '../../lib/presenter/picker.js',
      {
        '@clack/prompts': {
          select: async ({ options }: { options: Array<{ value: number }> }) =>
            options[1].value,
          isCancel: () => false
        }
      }
    )

    const picked = await pickGame(mergedGames)
    assert.equal(picked, mergedGames[1])
  })

  test('throws when the user cancels', async () => {
    const cancelToken = Symbol('cancel')
    const { pickGame } = await esmock(
      '../../lib/presenter/picker.js',
      {
        '@clack/prompts': {
          select: async () => cancelToken,
          isCancel: (value: unknown) => value === cancelToken
        }
      }
    )
    await assert.rejects(() => pickGame(mergedGames), /cancel/i)
  })

  test('throws on empty input', async () => {
    const { pickGame } = await esmock(
      '../../lib/presenter/picker.js',
      {
        '@clack/prompts': {
          select: async () => undefined,
          isCancel: () => false
        }
      }
    )
    await assert.rejects(() => pickGame([]), /no games/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/picker.spec.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/presenter/picker.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/picker.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/presenter/picker.ts test/presenter/picker.spec.ts
git commit -m "feat(presenter): add clack picker for game disambiguation"
```

---

## Task 9: Create `lib/presenter/render.ts` dispatcher

**Files:**
- Create: `lib/presenter/render.ts`
- Test: `test/presenter/render.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `test/presenter/render.spec.ts`:

```typescript
import assert from 'node:assert'
import { describe, test } from 'node:test'
import esmock from 'esmock'
import {
  mergedGameDataComplete,
  mergedGames
} from '../mock/index.mock.js'

async function loadRender(overrides: Record<string, unknown> = {}) {
  return esmock('../../lib/presenter/render.js', {
    '@clack/prompts': {
      select: async ({ options }: { options: Array<{ value: number }> }) =>
        options[0].value,
      isCancel: () => false,
      log: { error: () => {} }
    },
    ...overrides
  })
}

describe('render', () => {
  test('emits JSON via the writer when mode is json', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
    await render(mergedGames, {
      mode: 'json',
      isTty: true,
      write: (text: string) => writes.push(text)
    })
    const parsed = JSON.parse(writes.join(''))
    assert.ok(Array.isArray(parsed))
    assert.equal(parsed.length, mergedGames.length)
  })

  test('non-TTY auto-picks first match and emits JSON', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
    await render(mergedGames, {
      mode: 'summary',
      isTty: false,
      write: (text: string) => writes.push(text)
    })
    const parsed = JSON.parse(writes.join(''))
    // non-array because we picked one
    assert.equal(parsed.name, mergedGames[0].name)
  })

  test('TTY summary mode runs the picker and emits the summary', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
    await render(mergedGames, {
      mode: 'summary',
      isTty: true,
      write: (text: string) => writes.push(text)
    })
    const out = writes.join('')
    assert.match(out, new RegExp(mergedGames[0].name))
    assert.match(out, /Tier/)
  })

  test('TTY card mode runs the picker and emits the card', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
    await render(mergedGames, {
      mode: 'card',
      isTty: true,
      write: (text: string) => writes.push(text)
    })
    const out = writes.join('')
    assert.match(out, /Identity/)
    assert.match(out, /Compatibility/)
  })

  test('direct mode skips the picker and renders the single game', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
    await render(mergedGameDataComplete, {
      mode: 'summary',
      isTty: true,
      write: (text: string) => writes.push(text)
    })
    const out = writes.join('')
    assert.match(out, new RegExp(mergedGameDataComplete.name))
  })

  test('emits an error and exits non-zero on empty results', async () => {
    const writes: string[] = []
    const { render } = await loadRender()
    await assert.rejects(
      () =>
        render([], {
          mode: 'summary',
          isTty: true,
          write: (text: string) => writes.push(text)
        }),
      /no games/i
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/render.spec.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `lib/presenter/render.ts`:

```typescript
import type { GameData } from './formatter.js'
import { formatCard } from './card.js'
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

  if (!options.isTty && isArray) {
    write(formatJson(data[0]))
    write('\n')
    return
  }

  let game: GameData
  if (isArray) {
    game = await pickGame(data)
  } else {
    game = data
  }

  if (options.mode === 'card') {
    write(formatCard(game))
    write('\n')
    return
  }

  write(formatSummary(game))
  write('\n')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/render.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/presenter/render.ts test/presenter/render.spec.ts
git commit -m "feat(presenter): add render dispatcher for tty/json/picker flow"
```

---

## Task 10: Replace `lib/presenter/index.ts` exports, delete `display.ts` and `formats.ts`

**Files:**
- Modify: `lib/presenter/index.ts`
- Delete: `lib/presenter/display.ts`
- Delete: `lib/presenter/formats.ts`

- [ ] **Step 1: Replace `lib/presenter/index.ts`**

Replace the entire contents of `lib/presenter/index.ts` with:

```typescript
export { render } from './render.js'
export type { RenderMode, RenderOptions } from './render.js'
export type { GameData } from './formatter.js'
```

- [ ] **Step 2: Delete the obsolete files**

Run:
```bash
rm lib/presenter/display.ts
rm lib/presenter/formats.ts
```

- [ ] **Step 3: Verify the build passes for the presenter layer**

Run: `npx tsc --noEmit`

Expected: errors only in `lib/process/index.ts` (still importing `presentData` from the old API). Those will be fixed in Task 11.

- [ ] **Step 4: Run all presenter tests to verify nothing is broken**

Run: `npx tsx --test --import tsx/esm --loader esmock test/presenter/*.spec.ts`

Expected: All presenter tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/presenter/index.ts
git rm lib/presenter/display.ts lib/presenter/formats.ts
git commit -m "refactor(presenter): expose render dispatcher, drop blessed display"
```

---

## Task 11: Wire up new flags in `protondb-cli.ts`

**Files:**
- Modify: `protondb-cli.ts`

- [ ] **Step 1: Add `--game`, `--detail`, and `--json` options to yargs**

Edit `protondb-cli.ts`. Inside the `yargsInstance` chain (after the `clear_cache` option, before `.example(...)`), add these three options:

```typescript
        .option('game_id', {
          alias: 'g',
          type: 'string',
          description:
            'Look up a specific game by Steam objectID (skips search and picker)'
        })
        .option('detail', {
          alias: 'd',
          type: 'boolean',
          description: 'Show the full sectioned card instead of the summary',
          default: false
        })
        .option('json', {
          type: 'boolean',
          description: 'Emit JSON output (no color, no picker)',
          default: false
        })
```

Note: option name is `game_id` (not `game`) because `game` is already a positional. The `--game` flag in user-facing docs becomes `-g` / `--game_id` in code (yargs camelCase coercion makes both `gameId` accessible on the parsed object).

Update `.example(...)` to include a new example:

```typescript
        .example([
          [
            '$0 gta --concurrency 5 --hits 15',
            'Search the last 15 like gta using a conccurency of 5'
          ],
          [
            '$0 --game_id 220 --detail',
            'Look up Half-Life 2 by ID and show the full card'
          ],
          [
            '$0 fifa --json | jq .name',
            'Emit JSON for scripting'
          ]
        ])
```

- [ ] **Step 2: Update the `ProtondbCLIOptions` import / fields**

We will modify `lib/process/index.ts` in Task 12 to accept new fields. For now, no change needed to `protondb-cli.ts` beyond the yargs additions — the parsed object passes through.

- [ ] **Step 3: Verify the CLI parses the new flags**

Run:
```bash
npx tsx protondb-cli.ts --help
```

Expected: help output shows `--game_id`, `--detail`, `--json`. Exit 0.

- [ ] **Step 4: Commit**

```bash
git add protondb-cli.ts
git commit -m "feat(cli): add --game_id, --detail, --json flags"
```

---

## Task 12: Update `lib/process/index.ts` — replace ora with clack spinner, route render

**Files:**
- Modify: `lib/process/index.ts`
- Test: `test/process/process.spec.ts` (CREATE if not present, otherwise modify)

- [ ] **Step 1: Write the failing test**

Check if `test/process/` exists; if not, create it. Create or modify `test/process/process.spec.ts`:

```typescript
import assert from 'node:assert'
import { describe, test } from 'node:test'
import esmock from 'esmock'
import { mergedGames } from '../mock/index.mock.js'

describe('start', () => {
  test('routes search results to render with summary mode by default', async () => {
    let renderCall: { data: unknown; opts: unknown } | null = null
    const start = (
      await esmock('../../lib/process/index.js', {
        '../../lib/core/index.js': {
          getGamesReport: async () => mergedGames
        },
        '../../lib/cache/index.js': {
          createCache: async () => null
        },
        '../../lib/presenter/index.js': {
          render: async (data: unknown, opts: unknown) => {
            renderCall = { data, opts }
          }
        },
        '@clack/prompts': {
          spinner: () => ({ start: () => {}, stop: () => {} })
        }
      })
    ).default

    await start({
      game: 'fifa',
      verbose: false,
      hits: 5,
      concurrency: 2,
      disable_cache: true,
      clear_cache: false,
      game_id: undefined,
      detail: false,
      json: false
    })

    assert.ok(renderCall)
    assert.deepEqual(renderCall.data, mergedGames)
    assert.equal((renderCall.opts as { mode: string }).mode, 'summary')
  })

  test('routes to card mode when --detail is set', async () => {
    let mode: string | undefined
    const start = (
      await esmock('../../lib/process/index.js', {
        '../../lib/core/index.js': {
          getGamesReport: async () => mergedGames
        },
        '../../lib/cache/index.js': {
          createCache: async () => null
        },
        '../../lib/presenter/index.js': {
          render: async (_: unknown, opts: { mode: string }) => {
            mode = opts.mode
          }
        },
        '@clack/prompts': {
          spinner: () => ({ start: () => {}, stop: () => {} })
        }
      })
    ).default

    await start({
      game: 'fifa',
      verbose: false,
      hits: 5,
      concurrency: 2,
      disable_cache: true,
      clear_cache: false,
      game_id: undefined,
      detail: true,
      json: false
    })

    assert.equal(mode, 'card')
  })

  test('routes to json mode when --json is set', async () => {
    let mode: string | undefined
    const start = (
      await esmock('../../lib/process/index.js', {
        '../../lib/core/index.js': {
          getGamesReport: async () => mergedGames
        },
        '../../lib/cache/index.js': {
          createCache: async () => null
        },
        '../../lib/presenter/index.js': {
          render: async (_: unknown, opts: { mode: string }) => {
            mode = opts.mode
          }
        },
        '@clack/prompts': {
          spinner: () => ({ start: () => {}, stop: () => {} })
        }
      })
    ).default

    await start({
      game: 'fifa',
      verbose: false,
      hits: 5,
      concurrency: 2,
      disable_cache: true,
      clear_cache: false,
      game_id: undefined,
      detail: false,
      json: true
    })

    assert.equal(mode, 'json')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test --import tsx/esm --loader esmock test/process/process.spec.ts`

Expected: FAIL — current `process/index.ts` still imports `ora` and `presentData`.

- [ ] **Step 3: Replace `lib/process/index.ts`**

Replace the entire contents of `lib/process/index.ts` with:

```typescript
import type { Low } from 'lowdb'
import { spinner } from '@clack/prompts'
import { createCache } from '../cache/index.js'
import type { CacheData } from '../cache/index.js'
import getConfig from '../config/index.js'
import { getGamesReport } from '../core/index.js'
import type { GameData } from '../presenter/formatter.js'
import { type RenderMode, render } from '../presenter/index.js'

export interface ProtondbCLIOptions {
  game: string | null
  verbose?: boolean
  hits: number
  concurrency: number
  disable_cache: boolean
  clear_cache: boolean
  game_id?: string
  detail?: boolean
  json?: boolean
}

const config = getConfig()

function pickMode(opts: ProtondbCLIOptions): RenderMode {
  if (opts.json) return 'json'
  if (opts.detail) return 'card'
  return 'summary'
}

export default async function start(
  protondbCLI: ProtondbCLIOptions,
  logger: Pick<Console, 'info'> = console
): Promise<void> {
  let cache: Low<CacheData> | null
  if (protondbCLI.disable_cache) {
    cache = null
  } else {
    cache = await createCache()
  }

  if (protondbCLI.clear_cache && cache) {
    if (protondbCLI.verbose) {
      logger.info('\n[INFO]Cleaning up local cache')
    }
    cache.data.etags = {}
    cache.data.games = {}
    await cache.write()
  }

  const algoliaUrl = config.DEFAULT_ALGOLIA_QUERY_URL
  const algoliaApiKey = Buffer.from(
    config.DEFAULT_X_ALGOLIA_API_KEY,
    'base64'
  ).toString('utf-8')
  const algoliaApplicationId = Buffer.from(
    config.DEFAULT_X_ALGOLIA_APPLICATION_ID,
    'base64'
  ).toString('utf-8')
  const protondbUrl = config.DEFAULT_PROTONDB_URL
  const protondbProxyUrl = config.DEFAULT_PROTONDBPROXY_URL

  const mode = pickMode(protondbCLI)
  const isTty = process.stdout.isTTY === true
  const showSpinner = mode !== 'json' && isTty

  const options = {
    query: protondbCLI.game ?? '',
    hitsPerPage: protondbCLI.hits,
    algoliaApiKey,
    algoliaApplicationId,
    algoliaUrl,
    protondbUrl,
    protondbProxyUrl,
    concurrency: protondbCLI.concurrency,
    verbose: protondbCLI.verbose
  }

  let result: GameData[]
  if (showSpinner) {
    const sp = spinner()
    sp.start(`fetching results for "${protondbCLI.game}"`)
    try {
      result = (await getGamesReport(options, cache)) as unknown as GameData[]
      sp.stop('done')
    } catch (err) {
      sp.stop('failed')
      throw err
    }
  } else {
    result = (await getGamesReport(options, cache)) as unknown as GameData[]
  }

  if (cache) {
    await cache.write()
  }

  await render(result, { mode, isTty })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test --import tsx/esm --loader esmock test/process/process.spec.ts`

Expected: PASS for the three tests.

- [ ] **Step 5: Run all tests to ensure no regressions**

Run: `npm run unit`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/process/index.ts test/process/process.spec.ts
git commit -m "feat(process): replace ora with clack spinner, route render modes"
```

---

## Task 13: Add `getGameById` direct-lookup core function

**Files:**
- Modify: `lib/core/index.ts`
- Test: `test/core/get-game-by-id.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `test/core/get-game-by-id.spec.ts`:

```typescript
import assert from 'node:assert'
import { describe, test } from 'node:test'
import esmock from 'esmock'

describe('getGameById', () => {
  test('returns a single GameData merging protondb and proxy data', async () => {
    const { getGameById } = await esmock('../../lib/core/index.js', {
      '../../lib/fetcher/index.js': {
        algoliaFetcher: async () => {
          throw new Error('algoliaFetcher should not be called')
        },
        protondbFetcher: async () => ({
          tier: 'platinum',
          confidence: 'strong'
        }),
        protondbProxyFetcher: async () => ({
          '220': {
            data: {
              name: 'Half-Life 2',
              objectID: '220',
              oslist: ['Windows', 'Linux']
            }
          }
        })
      }
    })

    const result = await getGameById({
      objectId: '220',
      algoliaApiKey: 'k',
      algoliaApplicationId: 'a',
      algoliaUrl: 'http://x',
      protondbUrl: 'http://y',
      protondbProxyUrl: 'http://z'
    })

    assert.equal(result.name, 'Half-Life 2')
    assert.equal(result.tier, 'platinum')
    assert.equal(result.confidence, 'strong')
  })

  test('marks protondbNotFound when protondb has no tier/confidence', async () => {
    const { getGameById } = await esmock('../../lib/core/index.js', {
      '../../lib/fetcher/index.js': {
        algoliaFetcher: async () => null,
        protondbFetcher: async () => ({}),
        protondbProxyFetcher: async () => ({
          '999': { data: { name: 'Obscure Game', objectID: '999' } }
        })
      }
    })

    const result = await getGameById({
      objectId: '999',
      algoliaApiKey: 'k',
      algoliaApplicationId: 'a',
      algoliaUrl: 'http://x',
      protondbUrl: 'http://y',
      protondbProxyUrl: 'http://z'
    })

    assert.equal(result.protondbNotFound, true)
    assert.equal(result.tier, null)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test --import tsx/esm --loader esmock test/core/get-game-by-id.spec.ts`

Expected: FAIL — `getGameById` does not exist.

- [ ] **Step 3: Add `getGameById` to `lib/core/index.ts`**

Append to `lib/core/index.ts` (do not modify existing exports):

```typescript
export interface GetGameByIdOptions {
  objectId: string
  algoliaApiKey: string
  algoliaApplicationId: string
  algoliaUrl: string
  protondbUrl: string
  protondbProxyUrl: string
  verbose?: boolean
}

export async function getGameById(
  opts: GetGameByIdOptions
): Promise<Record<string, unknown>> {
  const protondbGame = await protondbFetcher({
    query: '',
    objectId: opts.objectId,
    url: opts.protondbUrl,
    name: '',
    verbose: opts.verbose,
    cache: null
  })
  const proxyResponse = await protondbProxyFetcher({
    appid: Number(opts.objectId),
    url: opts.protondbProxyUrl,
    verbose: opts.verbose,
    cache: null
  })
  const proxyData = proxyResponse as Record<
    string,
    { data: Record<string, unknown> }
  > | null
  const proxyGame = proxyData?.[opts.objectId]?.data ?? {}

  const merged: Record<string, unknown> = { ...proxyGame, ...protondbGame }

  if (!merged.tier || !merged.confidence) {
    return { ...merged, protondbNotFound: true, tier: null, confidence: null }
  }
  return merged
}
```

Note the `import { algoliaFetcher, protondbFetcher, protondbProxyFetcher } from '../fetcher/index.js'` at the top is already present from `getGamesReport`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test --import tsx/esm --loader esmock test/core/get-game-by-id.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/core/index.ts test/core/get-game-by-id.spec.ts
git commit -m "feat(core): add getGameById for direct steam id lookup"
```

---

## Task 14: Wire `--game_id` into `lib/process/index.ts`

**Files:**
- Modify: `lib/process/index.ts`
- Modify: `test/process/process.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to `test/process/process.spec.ts` inside the `describe('start', ...)` block:

```typescript
  test('uses getGameById and skips picker when --game_id is set', async () => {
    let renderArg: unknown = null
    let getGameByIdCalled = false
    let getGamesReportCalled = false

    const start = (
      await esmock('../../lib/process/index.js', {
        '../../lib/core/index.js': {
          getGamesReport: async () => {
            getGamesReportCalled = true
            return []
          },
          getGameById: async () => {
            getGameByIdCalled = true
            return {
              name: 'Half-Life 2',
              tier: 'platinum',
              confidence: 'strong'
            }
          }
        },
        '../../lib/cache/index.js': {
          createCache: async () => null
        },
        '../../lib/presenter/index.js': {
          render: async (data: unknown) => {
            renderArg = data
          }
        },
        '@clack/prompts': {
          spinner: () => ({ start: () => {}, stop: () => {} })
        }
      })
    ).default

    await start({
      game: null,
      verbose: false,
      hits: 5,
      concurrency: 2,
      disable_cache: true,
      clear_cache: false,
      game_id: '220',
      detail: false,
      json: false
    })

    assert.equal(getGameByIdCalled, true)
    assert.equal(getGamesReportCalled, false)
    assert.equal((renderArg as { name: string }).name, 'Half-Life 2')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test --import tsx/esm --loader esmock test/process/process.spec.ts`

Expected: FAIL — current `start` always calls `getGamesReport`.

- [ ] **Step 3: Update `lib/process/index.ts` to branch on `game_id`**

Edit the `start` function in `lib/process/index.ts`. Add an import:

```typescript
import { getGameById, getGamesReport } from '../core/index.js'
```

Then change the result-fetching block to:

```typescript
  let result: GameData | GameData[]
  const fetchPromise = protondbCLI.game_id
    ? (getGameById({
        objectId: protondbCLI.game_id,
        algoliaApiKey,
        algoliaApplicationId,
        algoliaUrl,
        protondbUrl,
        protondbProxyUrl,
        verbose: protondbCLI.verbose
      }) as Promise<unknown>)
    : (getGamesReport(options, cache) as Promise<unknown>)

  if (showSpinner) {
    const sp = spinner()
    const label = protondbCLI.game_id
      ? `looking up game id ${protondbCLI.game_id}`
      : `fetching results for "${protondbCLI.game}"`
    sp.start(label)
    try {
      result = (await fetchPromise) as GameData | GameData[]
      sp.stop('done')
    } catch (err) {
      sp.stop('failed')
      throw err
    }
  } else {
    result = (await fetchPromise) as GameData | GameData[]
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test --import tsx/esm --loader esmock test/process/process.spec.ts`

Expected: all four tests PASS.

- [ ] **Step 5: Run full unit suite**

Run: `npm run unit`

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/process/index.ts test/process/process.spec.ts
git commit -m "feat(process): branch on --game_id to use direct lookup"
```

---

## Task 15: Manual smoke test — TTY paths

**Files:** none (verification only)

- [ ] **Step 1: Build and link**

Run:
```bash
npm run build
npm link
```

Expected: `dist/protondb-cli.js` is generated, the binary is on PATH.

- [ ] **Step 2: Search query, summary mode**

Run: `protondb-cli "Half-Life"`

Expected: clack spinner during fetch → clack picker with N options → after picking, summary block with name + Tier + Confidence + OS + Score, all with color.

- [ ] **Step 3: Search query, card mode**

Run: `protondb-cli "Half-Life" --detail`

Expected: same flow as above, but the final output is the full sectioned card with Identity / Compatibility / Metadata / Requirements.

- [ ] **Step 4: Direct lookup**

Run: `protondb-cli --game_id 220 --detail`

Expected: spinner with "looking up game id 220" → no picker → full card for Half-Life 2.

- [ ] **Step 5: JSON mode in TTY**

Run: `protondb-cli "fifa" --json`

Expected: no spinner, no picker, no color. JSON array printed to stdout.

- [ ] **Step 6: Non-TTY auto-switch**

Run: `protondb-cli "fifa" | cat`

Expected: no spinner, no picker, no color. Single JSON object printed (top match auto-picked because of non-TTY).

- [ ] **Step 7: Empty result**

Run: `protondb-cli "z9z9z9z9zz"`

Expected: spinner stops with failure label → error "No games found" → non-zero exit.

- [ ] **Step 8: NO_COLOR env**

Run: `NO_COLOR=1 protondb-cli "Half-Life" --detail`

Expected: card output has no ANSI codes (chalk respects NO_COLOR automatically).

- [ ] **Step 9: Unlink**

Run: `npm unlink -g protondb-cli`

Expected: binary removed from PATH.

- [ ] **Step 10: No commit needed for this task** — manual verification only.

---

## Task 16: Update README and TODO

**Files:**
- Modify: `README.md`
- Modify: `TODO`

- [ ] **Step 1: Update `README.md`**

Read the current `README.md`. Update the usage section to reflect the new flags:
- `--game_id <id>` (`-g`)
- `--detail` (`-d`)
- `--json`

Mention the new behaviors:
- Picker is shown for any TTY search (even N=1)
- Non-TTY pipes auto-switch to JSON output
- No more full-screen TUI; output is normal scrollback

If `README.md` references `blessed` or shows screenshots of the TUI, replace with the new printed-output description.

- [ ] **Step 2: Update `TODO`**

Read `TODO` and remove any items related to "replace blessed" / "improve UI" / "modernize CLI output."

- [ ] **Step 3: Run lint/format on docs**

Run: `npm run lint:markdown`

Expected: PASS (or fix issues if any).

- [ ] **Step 4: Commit**

```bash
git add README.md TODO
git commit -m "docs: document new picker, --detail, --json flags and tty behavior"
```

---

## Task 17: Final verification — full test + lint pass

**Files:** none (verification only)

- [ ] **Step 1: Full test run with coverage**

Run: `npm test`

Expected: lint passes, all unit tests PASS, c8 coverage at 100% (per existing `c8 --100` flag) OR the coverage threshold is acknowledged as needing adjustment for new files. If coverage drops, add tests for uncovered branches before considering this task complete.

- [ ] **Step 2: Build verification**

Run: `npm run build`

Expected: clean compile, `dist/` regenerated.

- [ ] **Step 3: `dist/` smoke test**

Run: `node dist/protondb-cli.js "fifa" --json | jq -r '.name'`

Expected: top game name printed.

- [ ] **Step 4: No-commit verification task** — if everything passes, the rework is complete.

---

## Self-Review Notes

**Spec coverage:** All grilled-out decisions are covered:
- ✅ Migrate off blessed → Tasks 1, 7, 10
- ✅ Inline picker for disambiguation → Task 8
- ✅ `@clack/prompts` everywhere → Tasks 2, 8, 12
- ✅ Tiered output (summary default, card on `-d`, JSON on `--json`) → Tasks 4, 5, 6, 9, 11
- ✅ Picker shown for N=1 → Task 8 (test asserts it)
- ✅ Non-TTY auto-pick + JSON → Task 9 (test asserts it)
- ✅ `--game_id` direct lookup → Tasks 13, 14
- ✅ Replace `ora` with clack `spinner()` → Task 12
- ✅ NO_COLOR / FORCE_COLOR via chalk → automatic, smoke-tested in Task 15

**Type consistency:** `RenderMode` is `'summary' | 'card' | 'json'` consistently. `GameData` re-exported from `lib/presenter/index.ts`. `pickGame(GameData[]) → Promise<GameData>` signature consistent.

**Open questions for the executor (if any arise):**
- If `lib/core/index.ts` already imports `algoliaFetcher` but `getGameById` doesn't use it, it's fine — leave the import alone.
- If `c8 --100` fails due to new uncovered code, prefer adding tests over relaxing the threshold.
- If the picker UX feels too clunky for N=1 in practice, revisit (out of scope for this plan).
