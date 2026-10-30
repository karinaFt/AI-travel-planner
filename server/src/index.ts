// API server entry point: load config, build the app, listen.
import dotenv from 'dotenv'
import { createGeminiModel } from './ai/gemini.ts'
import { createApp } from './app.ts'
import { ConfigError, loadConfig, startupSummary, type Config } from './config.ts'
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

const { apiKey, model } = config.gemini
const itineraryModel = apiKey ? createGeminiModel({ apiKey, model }) : undefined
if (!itineraryModel) {
  log({ event: 'warning', message: 'GEMINI_API_KEY is not set; itinerary generation is disabled' })
}

createApp({ config, log, itineraryModel }).listen(config.port, (error) => {
  if (error) throw error
  log({ event: 'listening', ...startupSummary(config) })
})
