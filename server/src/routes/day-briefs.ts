import { dayBriefRequestSchema } from '@travel-planner/shared'
import { Router } from 'express'
import { generateBrief } from '../ai/generate-brief.ts'
import type { ItineraryModel } from '../ai/model.ts'
import { parseBody, runAiRequest, type AiRequestOptions } from '../http/ai-request.ts'
import { AppError } from '../http/errors.ts'
import type { FindPhoto } from '../photos/wikipedia.ts'

export type DayBriefsRouterOptions = AiRequestOptions & {
  /** Undefined when no API key is configured: valid requests then get `AI_UNAVAILABLE`. */
  model?: ItineraryModel
  findPhoto: FindPhoto
}

export function createDayBriefsRouter({ model, findPhoto, ...options }: DayBriefsRouterOptions) {
  const router = Router()

  router.post('/days/brief', async (req, res) => {
    const day = parseBody(dayBriefRequestSchema, req.body)
    if (!model) throw new AppError('AI_UNAVAILABLE')
    await runAiRequest(req, res, options, async (signal) => ({
      brief: await generateBrief(day, model, { signal, findPhoto }),
    }))
  })

  return router
}
