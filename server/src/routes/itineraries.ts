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

/** First message per field path, like the form shows them; issues about the body itself use `body`. */
function fieldErrors(error: z.ZodError): ValidationErrorDetails {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    fields[issue.path.length > 0 ? issue.path.join('.') : 'body'] ??= issue.message
  }
  return { fields }
}

/** `model` is undefined when no API key is configured: valid requests then get `AI_UNAVAILABLE`. */
export function createItinerariesRouter({ model }: { model?: ItineraryModel }) {
  const router = Router()

  router.post('/itineraries/generate', async (req, res) => {
    const preferences = tripPreferencesSchema.safeParse(req.body)
    if (!preferences.success) throw new AppError('VALIDATION_ERROR', fieldErrors(preferences.error))
    if (!model) throw new AppError('AI_UNAVAILABLE')

    const body: ApiSuccess<{ trip: Trip }> = { data: { trip: await generateTrip(preferences.data, model) } }
    res.json(body)
  })

  return router
}
