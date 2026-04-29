const HEADER_REQUEST_TEMPLATE: Record<string, string> = {
  accept: '*/*',
  authority: 'www.protondb.com',
  'accept-language': 'en-US,en;q=0.8',
  referer: 'https://www.protondb.com/search?q='
}

export const buildHeaderRequest = function _builddHeaderRequest(
  query?: string,
  etag: string | null = null
): Record<string, string> {
  if (!query) {
    throw new Error('query is required for build the referer header')
  }
  const headers: Record<string, string> = {
    ...HEADER_REQUEST_TEMPLATE,
    ...{ referer: HEADER_REQUEST_TEMPLATE.referer + query }
  }

  if (etag) {
    headers['If-None-Match'] = etag
  }
  return headers
}

export const buildUrl = function _buildUrl(
  url?: string,
  objectId?: string
): string {
  if (!url) {
    throw new Error('url is required')
  }

  if (!objectId) {
    throw new Error('objectId is required')
  }

  if (url[url.length - 1] !== '/') {
    url += '/'
  }

  return new URL(`${objectId}.json`, url).href
}
