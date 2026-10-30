import {
  tripPreferencesSchema,
  type ApiSuccess,
  type Trip,
  type ValidationErrorDetails,
} from '@travel-planner/shared'
import { Router } from 'express'
import type { z } from 'zod'
import { generateTrip } from '../ai/generate.ts'
import type { ItineraryModel } from '../ai/model.ts'
import { AppError } from '../http/errors.ts'
import type { InFlightGuard } from '../http/in-flight.ts'

/** First message per field path, like the form shows them; issues about the body itself use `body`. */
function fieldErrors(error: z.ZodError): ValidationErrorDetails {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    fields[issue.path.length > 0 ? issue.path.join('.') : 'body'] ??= issue.message
  }
  return { fields }
}

export type ItinerariesRouterOptions = {
  /** Undefined when no API key is configured: valid requests then get `AI_UNAVAILABLE`. */
  model?: ItineraryModel
  /** One generation at a time per client IP. */
  inFlight: InFlightGuard
  /** How long one AI call may take before it answers `AI_TIMEOUT`. */
  timeoutMs: number
}

export function createItinerariesRouter({ model, inFlight, timeoutMs }: ItinerariesRouterOptions) {
  const router = Router()

  router.post('/itineraries/generate', async (req, res) => {
    const preferences = tripPreferencesSchema.safeParse(req.body)
    if (!preferences.success) throw new AppError('VALIDATION_ERROR', fieldErrors(preferences.error))
    if (!model) throw new AppError('AI_UNAVAILABLE')

    // Only valid requests that will reach the AI take the slot.
    const release = inFlight.tryAcquire(req.ip ?? req.socket.remoteAddress ?? 'unknown')
    if (!release) throw new AppError('GENERATION_IN_PROGRESS')

    // `close` before the response ends means the client went away: stop waiting for the AI.
    const clientGone = new AbortController()
    const onClose = () => {
      if (!res.writableEnded) clientGone.abort()
    }
    res.on('close', onClose)
    const signal = AbortSignal.any([clientGone.signal, AbortSignal.timeout(timeoutMs)])
    try {
      const trip = await generateTrip(preferences.data, model, { signal })
      const body: ApiSuccess<{ trip: Trip }> = { data: { trip } }
      res.json(body)
    } catch (error) {
      // Nobody is left to answer; the request log records it as aborted.
      if (clientGone.signal.aborted) return
      throw error
    } finally {
      res.off('close', onClose)
      release()
    }
  })

  return router
}
