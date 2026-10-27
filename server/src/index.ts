// API server entry point: load config, build the app, listen.
import dotenv from 'dotenv'
import { createApp } from './app.ts'
import { ConfigError, loadConfig, type Config } from './config.ts'
import { createLogger } from './http/logger.ts'

// npm runs workspace scripts from server/, so this reads server/.env. Variables already set win.
dotenv.config({ quiet: true })

function readConfig(): Config {
  try {
    return loadConfig(process.env)
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error
    console.error(`Invalid configuration:\n${error.message}`)
    process.exit(1)
  }
}

const config = readConfig()
const log = createLogger()

createApp({ config, log }).listen(config.port, (error) => {
  if (error) throw error
  log({ event: 'listening', url: `http://localhost:${config.port}` })
})
