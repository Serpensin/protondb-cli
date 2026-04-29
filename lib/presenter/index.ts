import blessed from 'blessed'
import displayGame from './display.js'
import { format } from './formatter.js'
import type { GameData } from './formatter.js'

let displayGameView: blessed.Widgets.ListTableElement | null = null

const DISPLAY_BLESSED_NODE_INDEX = 1
const HEADER_INDEX = 1

export function presentData(data: GameData[]): void {
  const formatedData = format(data)
  const screen = blessed.screen()
  const list = blessed.listtable({
    tags: true,
    mouse: true,
    keys: true,
    interactive: true,
    data: formatedData,
    border: 'line',
    width: '100%',
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
  list.on(
    'select',
    async (_item: blessed.Widgets.BoxElement, index: number) => {
      displayGameView = await displayGame(
        data[index - HEADER_INDEX],
        list,
        screen
      )
    }
  )

  list.focus()

  screen.append(list)

  screen.key(['escape', 'q', 'C-c'], () => {
    if (displayGameView) {
      screen.children[DISPLAY_BLESSED_NODE_INDEX].detach()
      list.focus()
      list.show()
      screen.render()
      displayGameView = null
    } else {
      return process.exit(0)
    }
  })
  screen.render()
}
