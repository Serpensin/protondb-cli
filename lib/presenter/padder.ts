const SEPARATOR = '  '

export function padKeyValue(key: string, value: string, width: number): string {
  return `${key.padEnd(width, ' ')}${SEPARATOR}${value}`
}

export function padRows(rows: Array<[string, string]>): string {
  if (rows.length === 0) return ''
  const widest = rows.reduce(
    (max, [key]) => (key.length > max ? key.length : max),
    0
  )
  return rows.map(([key, value]) => padKeyValue(key, value, widest)).join('\n')
}
