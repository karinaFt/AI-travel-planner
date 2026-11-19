import {
  BRIEF_DESCRIPTION_MAX,
  dayBriefResultSchema,
  type Day,
  type DayBriefRequest,
  type DayBriefResult,
  type TripPreferences,
} from '@travel-planner/shared'
import { z } from 'zod'
import { postJson, type ApiResult } from './http.ts'
import { CLIENT_TIMEOUT_MS } from './itineraries.ts'

const successSchema = z.object({ data: z.object({ brief: dayBriefResultSchema }) })

/** The request body for one day: trip context, the day, and its activities with descriptions cut short. */
export function dayBriefRequest(preferences: TripPreferences, day: Day): DayBriefRequest {
  const { destination, currency, travelers, travelStyle, pace, interests } = preferences
  return {
    destination,
    currency,
    travelers,
    travelStyle,
    pace,
    interests,
    day: { dayNumber: day.dayNumber, date: day.date, title: day.title },
    activities: day.activities.map(({ id, title, category, startTime, durationMinutes, estimatedCost, description }) => ({
      id,
      title,
      category,
      startTime,
      durationMinutes,
      estimatedCost,
      description: description.slice(0, BRIEF_DESCRIPTION_MAX),
    })),
  }
}

/** Asks the API for a day overview. The returned blocks have passed the shared schema. */
export function createDayBrief(
  request: DayBriefRequest,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ApiResult<DayBriefResult>> {
  return postJson('/api/days/brief', request, {
    signal,
    timeoutMs: CLIENT_TIMEOUT_MS,
    parse: (body) => successSchema.parse(body).data.brief,
  })
}
