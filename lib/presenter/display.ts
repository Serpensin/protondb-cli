import * as url from 'node:url'
import blessed from 'blessed'
import {
  type GameData,
  formatGame,
  formatRequirements,
  generateRequirementsEntries,
  wrapCollection
} from './formatter.js'

const DEMO_GAME_DATA: GameData = {
  name: 'Demo Game',
  objectID: 9999999,
  releaseYear: 1930,
  tier: 'silver',
  confidence: 'good',
  oslist: ['Windows', 'Linux'],
  technologies: [],
  tags: [
    'Action',
    'Adventure',
    'Action',
    'Adventure',
    'Action',
    'Adventure',
    'Action',
    'Adventure',
    'Action',
    'Adventure',
    'Action',
    'Adventure',
    'Action',
    'Adventure',
    'Action',
    'Adventure',
    'Action',
    'Adventure',
    'Action',
    'Adventure',
    'Action',
    'Adventure',
    'Action',
    'Adventure',
    'Action',
    'Adventure',
    'Action',
    'Adventure'
  ],
  userScore: 99.99,
  followers: 1
}

const DEFAULT_PADDING_DISPLAY = 15

export default async function displayGame(
  gameData: GameData = DEMO_GAME_DATA,
  blenderList: blessed.Widgets.ListTableElement | null = null,
  screen: blessed.Widgets.Screen = blessed.screen()
): Promise<blessed.Widgets.ListTableElement> {
  const [name, tier, confidence] = formatGame(gameData)
  const requirements = formatRequirements(gameData)
  gameData.requirements = requirements
  const table = blessed.listtable({
    tags: true,
    mouse: true,
    keys: false,
    interactive: false,
    data: [[]],
    border: 'line',
    width: '100%',
    height: '100%',
    scrollable: true,
    noCellBorders: false,
    style: {
      fg: 'white',
      bg: 'default',
      border: {
        fg: 'green',
        bg: 'default'
      },
      header: {
        fg: 'white',
        bg: 'default',
        bold: 'true'
      },
      cell: {
        selected: {
          fg: 'white',
          bg: 'blue'
        }
      }
    }
  })

  if (blenderList) {
    blenderList.hide()
  }
  screen.append(table)

  updateTable(name, tier, confidence, gameData, table, screen)
  return table
}

function updateTable(
  name: string,
  tier: string,
  confidence: string,
  gameData: GameData,
  table: blessed.Widgets.ListTableElement,
  screen: blessed.Widgets.Screen
): void {
  let data: string[][] = [
    [`{bold}{red-fg}${name}{red-fg}{/bold}`, '-'],
    ['{bold}Steam ObjectId{/bold}', `${gameData.objectID}`],
    ['{bold}Steam URL{/bold}', `https://steamdb.info/app/${gameData.objectID}`],
    [
      '{bold}Protondb URL{/bold}',
      `https://www.protondb.com/app/${gameData.objectID}`
    ],
    ['{bold}Tier{/bold}', `${tier}`],
    ['{bold}Confidence{/bold}', `${confidence}`],
    ['{bold}OS List{/bold}', `${gameData.oslist?.join(',')}`],
    ['{bold}SteamDB Rating{/bold}', `${gameData.userScore}%`],
    ['{bold}Release Date{/bold}', `${gameData?.release_date?.date ?? '-'}`],
    ['{bold}Developers{/bold}', `${gameData?.developers ?? '-'}`],
    ['{bold}Publishers{/bold}', `${gameData?.publishers ?? '-'}`]
  ]
    .concat(
      generateWrappedEntries(
        '{bold}Tags{/bold}',
        gameData.tags,
        table.width,
        name
      )
    )
    .concat(
      generateWrappedEntries(
        '{bold}Technologies{/bold}',
        gameData.technologies,
        table.width,
        name
      )
    )
  if (gameData.genres && Array.isArray(gameData.genres)) {
    const genres = gameData.genres
      .reduce((acum, genreObj) => `${acum},${genreObj.description}`, '')
      .slice(1)
    data.push(['{bold}Genres{/bold}', genres])
  }

  if (gameData.recommendations) {
    data.push([
      '{bold}Recommendations{/bold}',
      `${gameData?.recommendations?.total ?? '-'}`
    ])
  }

  if (gameData.requirements) {
    if (
      gameData?.requirements?.minimum &&
      Object.keys(gameData?.requirements?.minimum).length > 0
    ) {
      data.push([
        '{bold}{yellow-fg}Minimum Requirements{/yellow-fg}{/bold}',
        '-'
      ])
      data = generateRequirementsEntries(gameData?.requirements?.minimum, data)
    }

    if (
      gameData?.requirements?.recommended &&
      Object.keys(gameData?.requirements?.recommended).length > 0
    ) {
      data.push([
        '{bold}{green-fg}Recommended Requirements{/green-fg}{/bold}',
        '-'
      ])
      data = generateRequirementsEntries(
        gameData?.requirements?.recommended,
        data
      )
    }
  }

  table.setData(data)
  screen.render()
}

function generateWrappedEntries(
  title: string,
  data: unknown,
  width: number | string,
  gameName: string
): string[][] {
  if (data && Array.isArray(data)) {
    const numericWidth =
      typeof width === 'number'
        ? width
        : Number.parseInt(String(width), 10) || 0
    const wrappedData = wrapCollection(
      data,
      numericWidth - gameName.length - DEFAULT_PADDING_DISPLAY
    )
    return wrappedData.map((line): string[] => [title, line])
  }
  return []
}

if (import.meta.url.startsWith('file:')) {
  const modulePath = url.fileURLToPath(import.meta.url)
  if (process.argv[1] === modulePath) {
    displayGame()
  }
}
