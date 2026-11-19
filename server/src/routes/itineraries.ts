import { tripPreferencesSchema } from '@travel-planner/shared'
import { Router } from 'express'
import { generateTrip } from '../ai/generate.ts'
import type { ItineraryModel } from '../ai/model.ts'
import { parseBody, runAiRequest, type AiRequestOptions } from '../http/ai-request.ts'
import { AppError } from '../http/errors.ts'

export type ItinerariesRouterOptions = AiRequestOptions & {
  /** Undefined when no API key is configured: valid requests then get `AI_UNAVAILABLE`. */
  model?: ItineraryModel
}

export function createItinerariesRouter({ model, ...options }: ItinerariesRouterOptions) {
  const router = Router()

  router.post('/itineraries/generate', async (req, res) => {
    const preferences = parseBody(tripPreferencesSchema, req.body)
    if (!model) throw new AppError('AI_UNAVAILABLE')
    // Only valid requests that will reach the AI take the slot.
    await runAiRequest(req, res, options, async (signal) => ({
      trip: await generateTrip(preferences, model, { signal }),
    }))
  })

  return router
}
