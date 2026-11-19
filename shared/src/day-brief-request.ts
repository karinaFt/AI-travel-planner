import { z } from 'zod'
import { ACTIVITY_LIMITS, activitySchema, daySchema, type Activity } from './itinerary.ts'
import { tripPreferencesSchema } from './trip-preferences.ts'

/** Descriptions are cut to this length before sending, so a full day stays under the 10 KB body limit. */
export const BRIEF_DESCRIPTION_MAX = 160

const briefActivitySchema = activitySchema
  .pick({ id: true, title: true, category: true, startTime: true, durationMinutes: true, estimatedCost: true })
  .extend({ description: z.string().trim().max(BRIEF_DESCRIPTION_MAX) })

const preferences = tripPreferencesSchema.shape

/** What the client sends to `POST /api/days/brief`: the trip context, the day and its activities. */
export const dayBriefRequestSchema = z.object({
  destination: preferences.destination,
  currency: preferences.currency,
  travelers: preferences.travelers,
  travelStyle: preferences.travelStyle,
  pace: preferences.pace,
  interests: preferences.interests,
  day: daySchema.pick({ dayNumber: true, date: true, title: true }),
  activities: z
    .array(briefActivitySchema)
    .min(1)
    .max(ACTIVITY_LIMITS.perDay.max)
    .refine((activities) => new Set(activities.map((a) => a.id)).size === activities.length, 'Activity IDs must be unique'),
})

export type DayBriefRequest = z.output<typeof dayBriefRequestSchema>
export type BriefActivity = z.output<typeof briefActivitySchema>

type SignedFields = Pick<Activity, 'id' | 'title' | 'category' | 'startTime' | 'durationMinutes' | 'estimatedCost'>

/**
 * A short fingerprint of a day's activities (FNV-1a, 32-bit, hex). It changes when an activity is added,
 * removed or reordered, or when its title, category, time, duration or cost changes; not its description.
 */
export function activitySignature(activities: readonly SignedFields[]) {
  const source = JSON.stringify(
    activities.map((a) => [a.id, a.title, a.category, a.startTime, a.durationMinutes, a.estimatedCost]),
  )
  let hash = 0x811c9dc5
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
