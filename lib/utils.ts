import fs from 'node:fs'

export function isValidUrl(url: string): void {
  const furl = new URL(url)
  if (furl.protocol !== 'http:' && furl.protocol !== 'https:') {
    throw new Error('Invalid url protocol')
  }
}

export function isValidGameName(gameName: unknown): string {
  if (
    !(typeof gameName === 'string' || gameName instanceof String) ||
    !gameName
  ) {
    throw new Error('Invalid game name')
  }
  return gameName as string
}

export function debugGameData(gameData: unknown): void {
  fs.writeFileSync('/tmp/debug.json', JSON.stringify(gameData))
}
