import { randomUUID } from 'node:crypto'
import { tripLengthInDays, type Trip, type TripPreferences } from '@travel-planner/shared'
import type { ItineraryModel } from './model.ts'
import { normalizeTrip, type NormalizeDeps } from './normalize.ts'
import { buildPrompt } from './prompt.ts'
import { responseJsonSchema } from './response-schema.ts'

const defaultDeps: NormalizeDeps = { newId: randomUUID, now: () => new Date() }

/** One AI call, no retry: prompt → model → validated, normalized trip. */
export async function generateTrip(
  preferences: TripPreferences,
  model: ItineraryModel,
  deps: NormalizeDeps = defaultDeps,
): Promise<Trip> {
  const { systemInstruction, contents } = buildPrompt(preferences)
  const days = tripLengthInDays(preferences.startDate, preferences.endDate)
  const text = await model.generate({ systemInstruction, contents, responseJsonSchema: responseJsonSchema(days) })
  return normalizeTrip(text, preferences, deps)
}
