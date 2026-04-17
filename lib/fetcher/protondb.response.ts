const REQUIRED_PROTONDB_PROPS = [
  'tier',
  'score',
  'total',
  'confidence',
  'trendingTier',
  'bestReportedTier'
]

export function checkProtondbResponse(
  protondbResponse: unknown,
  requiredProps: string[] = REQUIRED_PROTONDB_PROPS
): void {
  const response = protondbResponse as Record<string, unknown>
  requiredProps.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(response, key)) {
      throw new Error(`protondb response doesnt have the property "${key}"`)
    }
  })
}
