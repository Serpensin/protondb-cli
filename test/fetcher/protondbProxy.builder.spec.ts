import assert from 'node:assert'
import { describe, test } from 'node:test'
import { buildUrl } from '../../lib/fetcher/protondbProxy.builder.js'

describe('protondbProxy.buildUrl', () => {
  test('buildUrl function must throw an error if the url is not provided', () => {
    try {
      buildUrl()
      assert.fail('error is expected')
    } catch (error) {
      assert.match((error as Error).message, /url is required/)
    }
  })

  test('buildUrl function must throw an error if the objectId is not provided', () => {
    try {
      buildUrl('https://www.protondb.com/proxy/steam/api/appdetails')
      assert.fail('error is expected')
    } catch (error) {
      assert.match((error as Error).message, /objectId is required/)
    }
  })

  test('buildUrl function must return the final url even if the url params comes without a slash at the end', () => {
    try {
      const url = buildUrl(
        'https://www.protondb.com/proxy/steam/api/appdetails',
        '1486440'
      )
      assert.equal(
        url,
        'https://www.protondb.com/proxy/steam/api/appdetails/?appids=1486440'
      )
    } catch (_error) {
      assert.fail('error is not expected')
    }
  })

  test('buildUrl function must return a final url with objectId', () => {
    try {
      const url = buildUrl(
        'https://www.protondb.com/proxy/steam/api/appdetails/',
        '1486440'
      )
      assert.equal(
        url,
        'https://www.protondb.com/proxy/steam/api/appdetails/?appids=1486440'
      )
    } catch (_error) {
      assert.fail('error is not expected')
    }
  })
})
