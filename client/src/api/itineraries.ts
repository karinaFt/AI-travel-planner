import { tripSchema, type Trip, type TripPreferences } from '@travel-planner/shared'
import { z } from 'zod'
import { postJson, type ApiResult } from './http.ts'

/** Longer than the server's own 30 s limit: this only catches a hung connection or proxy. */
export const CLIENT_TIMEOUT_MS = 45_000

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
