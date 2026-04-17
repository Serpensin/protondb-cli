const REQUIRED_ALGOLIA_PROPS = [
  'lastUpdated',
  'name',
  'oslist',
  'userScore',
  'releaseYear',
  'objectID'
]

export function checkAlgoliaResponse(
  algoliaResponse: unknown,
  requiredProps: string[] = REQUIRED_ALGOLIA_PROPS
): void {
  const response = algoliaResponse as Record<string, unknown>

  if (!Object.prototype.hasOwnProperty.call(response, 'hits')) {
    throw new Error('algolia response does not have "hits" property')
  }

  if (!Array.isArray(response.hits)) {
    throw new Error('algolia "hits" is not an array')
  }

  const sampleDate = response.hits[0] as Record<string, unknown>
  requiredProps.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(sampleDate, key)) {
      throw new Error(`algolia "hit" doesnt have the property "${key}"`)
    }
  })

  if (!Array.isArray(sampleDate.oslist)) {
    throw new Error('algolia "hit" doesnt have a valid "oslist" property')
  }
}
