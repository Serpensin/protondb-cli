const DEFAULT_HITS_PER_PAGE = 50

interface AlgoliaBodyTemplate {
  attributesToHighlight: string[]
  attributesToSnippet: string[]
  facets: string[]
  facetFilters: string[][]
  hitsPerPage: number
  attributesToRetrieve: string[]
  page: number
}

interface AlgoliaRequestTemplate {
  body: AlgoliaBodyTemplate
  method: string
}

const BODY_REQUEST_TEMPLATE: AlgoliaRequestTemplate = {
  body: {
    attributesToHighlight: [],
    attributesToSnippet: [],
    facets: ['tags'],
    facetFilters: [['appType:Game']],
    hitsPerPage: DEFAULT_HITS_PER_PAGE,
    attributesToRetrieve: [
      'lastUpdated',
      'name',
      'objectID',
      'followers',
      'oslist',
      'releaseYear',
      'tags',
      'technologies',
      'userScore'
    ],
    page: 0
  },
  method: 'POST'
}

export interface BuildBodyRequestInput {
  query: string
  hitsPerPage?: number | null
}

export interface AlgoliaBodyRequest {
  body: AlgoliaBodyTemplate & { query: string }
  method: string
}

export const buildBodyRequest = function _buildBodyRequest({
  query,
  hitsPerPage
}: BuildBodyRequestInput): AlgoliaBodyRequest {
  const dhitsPerPage = hitsPerPage ?? DEFAULT_HITS_PER_PAGE
  const newBody = {
    ...BODY_REQUEST_TEMPLATE.body,
    ...{ query, hitsPerPage: dhitsPerPage }
  }
  return { ...BODY_REQUEST_TEMPLATE, body: newBody }
}

const HEADER_REQUEST_TEMPLATE: Record<string, string> = {
  accept: '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/x-www-form-urlencoded',
  referer: 'https://www.protondb.com',
  origin: 'https://www.protondb.com',
  connection: 'keep-alive'
}

export const buildHeaderRequest = function _builddHeaderRequest(
  headers: Record<string, string>
): Record<string, string> {
  if (!Object.prototype.hasOwnProperty.call(headers, 'x-algolia-api-key')) {
    throw new Error('x-algolia-api-key is required for the headers')
  }
  if (
    !Object.prototype.hasOwnProperty.call(headers, 'x-algolia-application-id')
  ) {
    throw new Error('x-algolia-application-id is required for the headers')
  }
  return { ...HEADER_REQUEST_TEMPLATE, ...headers }
}
