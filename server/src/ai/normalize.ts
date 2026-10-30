import {
  ACTIVITY_CATEGORIES,
  tripDates,
  tripSchema,
  type ActivityCategory,
  type Trip,
  type TripPreferences,
} from '@travel-planner/shared'
import { AppError } from '../http/errors.ts'
import { aiItinerarySchema } from './response-schema.ts'

export type NormalizeDeps = {
  newId: () => string
  now: () => Date
}

const invalidResponse = () => new AppError('AI_INVALID_RESPONSE')

function toCategory(category: string): ActivityCategory {
  const key = category.trim().toLowerCase()
  return (ACTIVITY_CATEGORIES as readonly string[]).includes(key) ? (key as ActivityCategory) : 'other'
}

const toCents = (amount: number) => Math.round(amount * 100) / 100

/**
 * Turns the model's JSON text into a trip. The server owns IDs, day numbers, dates and currency;
 * `tripSchema` has the final word. Throws `AI_INVALID_RESPONSE` for anything unusable.
 */
export function normalizeTrip(text: string, preferences: TripPreferences, { newId, now }: NormalizeDeps): Trip {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw invalidResponse()
  }

  const parsed = aiItinerarySchema.safeParse(json)
  if (!parsed.success) throw invalidResponse()

  const dates = tripDates(preferences.startDate, preferences.endDate)
  if (parsed.data.days.length !== dates.length) throw invalidResponse()

  const candidate = {
    id: newId(),
    createdAt: now().toISOString(),
    preferences,
    itinerary: {
      days: parsed.data.days.map((day, index) => ({
        id: newId(),
        dayNumber: index + 1,
        date: dates[index],
        title: day.title.trim(),
        activities: day.activities
          .map((activity) => ({
            id: newId(),
            title: activity.title.trim(),
            description: activity.description.trim(),
            category: toCategory(activity.category),
            startTime: activity.startTime,
            durationMinutes: activity.durationMinutes,
            estimatedCost: toCents(activity.estimatedCost),
            currency: preferences.currency,
          }))
          // Stable: activities with the same start time keep the model's order.
          .toSorted((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0)),
      })),
    },
  }

  const trip = tripSchema.safeParse(candidate)
  if (!trip.success) throw invalidResponse()
  return trip.data
}
