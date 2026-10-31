import cors from 'cors'
import express, { type Router } from 'express'
import helmet from 'helmet'
import type { ItineraryModel } from './ai/model.ts'
import type { Config } from './config.ts'
import { clientApp } from './http/client-app.ts'
import { createErrorHandler, notFound } from './http/errors.ts'
import { createInFlightGuard } from './http/in-flight.ts'
import { jsonBody } from './http/json-body.ts'
import { requestLogger, type Logger } from './http/logger.ts'
import { generationRateLimit } from './http/rate-limit.ts'
import { requestId } from './http/request-id.ts'
import { GENERATION_LIMITS, type GenerationLimits } from './protection.ts'
import { clientIpRouter } from './routes/client-ip.ts'
import { healthRouter } from './routes/health.ts'
import { createItinerariesRouter } from './routes/itineraries.ts'

export type AppOptions = {
  config: Config
  log: Logger
  /** Undefined when no API key is configured; generation then answers `AI_UNAVAILABLE`. */
  itineraryModel?: ItineraryModel
  /** Test-only routes mounted under /api, before the 404 fallback. Production code never passes it. */
  extraRoutes?: Router
  /** Test-only overrides of `GENERATION_LIMITS`, such as a short timeout. Production code never passes it. */
  generationLimits?: Partial<GenerationLimits>
}

export function createApp({ config, log, itineraryModel, extraRoutes, generationLimits }: AppOptions) {
  // Built per app, so each app (and test) gets its own counters.
  const limits: GenerationLimits = { ...GENERATION_LIMITS, ...generationLimits }
  const app = express()
  app.disable('x-powered-by')
  // 0 = trust nothing: req.ip is the socket address. N = the client IP is N hops back in X-Forwarded-For.
  app.set('trust proxy', config.trustProxy)

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
  app.post('/api/itineraries/generate', ...generationRateLimit(limits))
  app.use(jsonBody)

  app.use('/api', healthRouter)
  if (config.exposeClientIp) app.use('/api', clientIpRouter)
  app.use(
    '/api',
    createItinerariesRouter({ model: itineraryModel, inFlight: createInFlightGuard(), timeoutMs: limits.timeoutMs }),
  )
  if (extraRoutes) app.use('/api', extraRoutes)
  app.use('/api', notFound)
  // After the /api 404, so API paths never fall through to index.html.
  if (config.clientDir) app.use(clientApp(config.clientDir))
  app.use(createErrorHandler(log))

  return app
}
