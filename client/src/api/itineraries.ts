import { tripSchema, type Trip, type TripPreferences } from '@travel-planner/shared'
import { z } from 'zod'
import { postJson, type ApiResult } from './http.ts'

/** Well past the server's own 30 s limit: room for a free-tier server waking up (about a minute), or a hung connection. */
export const CLIENT_TIMEOUT_MS = 90_000

const successSchema = z.object({ data: z.object({ trip: tripSchema }) })

/** Asks the API for an itinerary. The returned trip has passed the shared `tripSchema`. */
export function generateItinerary(
  preferences: TripPreferences,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ApiResult<Trip>> {
  return postJson('/api/itineraries/generate', preferences, {
    signal,
    timeoutMs: CLIENT_TIMEOUT_MS,
    parse: (body) => successSchema.parse(body).data.trip,
  })
}
