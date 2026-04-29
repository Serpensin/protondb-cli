import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export interface Config {
  DEFAULT_PROTONDB_CLI_HITS: number
  DEFAULT_ALGOLIA_QUERY_URL: string
  DEFAULT_X_ALGOLIA_API_KEY: string
  DEFAULT_X_ALGOLIA_APPLICATION_ID: string
  DEFAULT_PROTONDB_URL: string
  DEFAULT_PROTONDBPROXY_URL: string
}

let config: Config | null = null
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultConfigPath = path.join(__dirname, '../../default.json')

export default function getConfig(path: string = defaultConfigPath): Config {
  if (!config) {
    config = JSON.parse(fs.readFileSync(path, 'utf-8')) as Config
  }
  return config
}
