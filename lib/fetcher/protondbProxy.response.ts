const REQUIRED_PROTONDB_PROXY_PROPS = ['genres', 'recommendations']

export function checkProtondbProxyResponse(
  protondbProxyResponse: unknown,
  appId: string,
  requiredProps: string[] = REQUIRED_PROTONDB_PROXY_PROPS
): void {
  const proxyResponse = protondbProxyResponse as Record<string, unknown>

  if (!Object.prototype.hasOwnProperty.call(proxyResponse, appId)) {
    throw new Error(`protondbproxy response doesnt have the appid "${appId}"`)
  }

  const game = proxyResponse[appId] as Record<string, unknown>

  if (!Object.prototype.hasOwnProperty.call(game, 'success') && game.success) {
    throw new Error(
      'protondbproxy game response doesnt have a valid success property'
    )
  }

  if (!Object.prototype.hasOwnProperty.call(game, 'data')) {
    throw new Error(
      'protondbproxy game response doesnt have a valid game property'
    )
  }

  const gameData = game.data as Record<string, unknown>

  requiredProps.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(gameData, key)) {
      throw new Error(
        `protondbproxy response doesnt have the property "${key}"`
      )
    }
  })

  const genres = gameData.genres
  if (!Array.isArray(genres)) {
    throw new Error('genres is not an array')
  }

  const sampleGenre = genres[0] as Record<string, unknown>
  const sampleRecommendations = gameData.recommendations as Record<
    string,
    unknown
  >

  if (!Object.prototype.hasOwnProperty.call(sampleGenre, 'description')) {
    throw new Error('genre object does not have the description property')
  }

  if (!Object.prototype.hasOwnProperty.call(sampleRecommendations, 'total')) {
    throw new Error('recommendation object does not have the total property')
  }
}
