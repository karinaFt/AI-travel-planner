import cors from 'cors'
import express, { type Router } from 'express'
import helmet from 'helmet'
import type { ItineraryModel } from './ai/model.ts'
import type { Config } from './config.ts'
import { errorHandler, notFound } from './http/errors.ts'
import { jsonBody } from './http/json-body.ts'
import { requestLogger, type Logger } from './http/logger.ts'
import { requestId } from './http/request-id.ts'
import { healthRouter } from './routes/health.ts'
import { createItinerariesRouter } from './routes/itineraries.ts'

export type AppOptions = {
  config: Config
  log: Logger
  /** Undefined when no API key is configured; generation then answers `AI_UNAVAILABLE`. */
  itineraryModel?: ItineraryModel
  /** Test-only routes mounted under /api, before the 404 fallback. Production code never passes it. */
  extraRoutes?: Router
}

export function createApp({ config, log, itineraryModel, extraRoutes }: AppOptions) {
  const app = express()
  app.disable('x-powered-by')

  app.use(requestId)
  app.use(requestLogger(log))
  app.use(helmet())
  app.use(
    cors({
      // Allowed origins are echoed back; others get no allow header but the request still runs.
      origin: (origin, callback) => callback(null, origin !== undefined && config.allowedOrigins.includes(origin)),
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
    }),
  )
  app.use(jsonBody)

  app.use('/api', healthRouter)
  app.use('/api', createItinerariesRouter({ model: itineraryModel }))
  if (extraRoutes) app.use('/api', extraRoutes)
  app.use('/api', notFound)
  app.use(errorHandler)

  return app
}
