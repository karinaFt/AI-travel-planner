import { z } from 'zod'
import { tripBasicsSchema } from './trip-basics.ts'

export const TRAVEL_STYLES = ['relaxation', 'adventure', 'culture', 'food', 'nature'] as const
export type TravelStyle = (typeof TRAVEL_STYLES)[number]

export const PACES = ['relaxed', 'balanced', 'packed'] as const
export type Pace = (typeof PACES)[number]

export const DEFAULT_PACE: Pace = 'balanced'

export const ORIGIN_LIMITS = { min: 2, max: 100 } as const
export const INTEREST_LIMITS = { min: 2, max: 40, count: 10 } as const

export const PREFERENCE_MESSAGES = {
  originLength: `Starting point must be ${ORIGIN_LIMITS.min}–${ORIGIN_LIMITS.max} characters`,
  travelStyle: 'Choose a travel style',
  pace: 'Choose a pace',
  interestLength: `Interests must be ${INTEREST_LIMITS.min}–${INTEREST_LIMITS.max} characters`,
  interestDuplicate: 'That interest is already in the list',
  interestCount: `You can add up to ${INTEREST_LIMITS.count} interests`,
} as const

/** One interest as the user typed it: trimmed, 2–40 characters. */
export const interestSchema = z
  .string({ error: PREFERENCE_MESSAGES.interestLength })
  .trim()
  .min(INTEREST_LIMITS.min, PREFERENCE_MESSAGES.interestLength)
  .max(INTEREST_LIMITS.max, PREFERENCE_MESSAGES.interestLength)

/** True when the list already holds this interest, ignoring case and surrounding spaces. */
export function hasInterest(interests: readonly string[], candidate: string) {
  const key = candidate.trim().toLowerCase()
  return interests.some((interest) => interest.trim().toLowerCase() === key)
}

/** "Starting from" as typed: empty or whitespace-only means "not provided" (undefined). */
export const originSchema = z
  .string({ error: PREFERENCE_MESSAGES.originLength })
  .trim()
  .transform((origin) => (origin === '' ? undefined : origin))
  .refine(
    (origin) =>
      origin === undefined || (origin.length >= ORIGIN_LIMITS.min && origin.length <= ORIGIN_LIMITS.max),
    PREFERENCE_MESSAGES.originLength,
  )

const interestsSchema = z
  .array(interestSchema, { error: PREFERENCE_MESSAGES.interestLength })
  .max(INTEREST_LIMITS.count, PREFERENCE_MESSAGES.interestCount)
  .superRefine((interests, ctx) => {
    interests.forEach((interest, index) => {
      if (hasInterest(interests.slice(0, index), interest)) {
        ctx.addIssue({ code: 'custom', path: [index], message: PREFERENCE_MESSAGES.interestDuplicate })
      }
    })
  })

/** Everything the planner needs to know about a trip, as sent to the server. */
export const tripPreferencesSchema = tripBasicsSchema.safeExtend({
  origin: originSchema.optional(),
  travelStyle: z.enum(TRAVEL_STYLES, { error: PREFERENCE_MESSAGES.travelStyle }),
  pace: z.enum(PACES, { error: PREFERENCE_MESSAGES.pace }),
  interests: interestsSchema,
})

export type TripPreferences = z.output<typeof tripPreferencesSchema>
