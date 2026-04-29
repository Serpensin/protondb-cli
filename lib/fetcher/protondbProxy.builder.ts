export const buildUrl = function _buildUrl(
  url?: string,
  objectId?: string | number
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

  const urlObj = new URL(url)
  urlObj.searchParams.set('appids', String(objectId))
  return urlObj.href
}
