import { z } from 'zod'
import { isIsoDate, tripDates, tripLengthInDays } from './dates.ts'
import { CURRENCIES, LIMITS, MAX_TRIP_DAYS, hasAtMostTwoDecimals } from './trip-basics.ts'
import { tripPreferencesSchema } from './trip-preferences.ts'

export const ACTIVITY_CATEGORIES = [
  'sightseeing',
  'culture',
  'food',
  'nature',
  'adventure',
  'relaxation',
  'shopping',
  'nightlife',
  'transport',
  'other',
] as const
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number]

export const ACTIVITY_LIMITS = {
  title: { min: 1, max: 120 },
  description: { max: 1000 },
  durationMinutes: { min: 5, max: 1440 },
  perDay: { max: 20 },
} as const

/** 24-hour `HH:mm`, from 00:00 to 23:59. */
export const START_TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const isoDate = z.string().refine(isIsoDate, 'Expected a YYYY-MM-DD date')
const title = z.string().trim().min(ACTIVITY_LIMITS.title.min).max(ACTIVITY_LIMITS.title.max)

export const activitySchema = z.object({
  id: z.uuid(),
  title,
  description: z.string().trim().max(ACTIVITY_LIMITS.description.max),
  category: z.enum(ACTIVITY_CATEGORIES),
  startTime: z.string().regex(START_TIME),
  durationMinutes: z
    .number()
    .int()
    .min(ACTIVITY_LIMITS.durationMinutes.min)
    .max(ACTIVITY_LIMITS.durationMinutes.max),
  /** For the whole group, in `currency`. */
  estimatedCost: z.number().min(0).max(LIMITS.budget.max).refine(hasAtMostTwoDecimals, 'Use at most 2 decimals'),
  currency: z.enum(CURRENCIES),
})

/** Activities are kept sorted by start time; equal times keep their order. */
export const daySchema = z.object({
  id: z.uuid(),
  dayNumber: z.number().int().min(1),
  date: isoDate,
  title,
  activities: z
    .array(activitySchema)
    .max(ACTIVITY_LIMITS.perDay.max)
    .refine(
      (activities) => activities.every((activity, i) => i === 0 || activities[i - 1].startTime <= activity.startTime),
      'Activities must be sorted by start time',
    ),
})

/** Days numbered from 1 on consecutive dates. */
export const itinerarySchema = z.object({
  days: z
    .array(daySchema)
    .min(1)
    .max(MAX_TRIP_DAYS)
    .refine((days) => days.every((day, i) => day.dayNumber === i + 1), 'Days must be numbered from 1')
    .refine(
      (days) => days.every((day, i) => i === 0 || tripLengthInDays(days[i - 1].date, day.date) === 2),
      'Days must be on consecutive dates',
    ),
})

/** A generated trip: what the API returns and what the browser shows and saves. */
export const tripSchema = z
  .object({
    id: z.uuid(),
    createdAt: z.iso.datetime(),
    preferences: tripPreferencesSchema,
    itinerary: itinerarySchema,
  })
  .refine(
    ({ preferences, itinerary }) =>
      tripDates(preferences.startDate, preferences.endDate).join() === itinerary.days.map((day) => day.date).join(),
    { message: 'Days must cover the trip dates', path: ['itinerary', 'days'] },
  )
  .refine(
    ({ preferences, itinerary }) =>
      itinerary.days.every((day) => day.activities.every((activity) => activity.currency === preferences.currency)),
    { message: 'Activities must use the trip currency', path: ['itinerary', 'days'] },
  )

export type Activity = z.output<typeof activitySchema>
export type Day = z.output<typeof daySchema>
export type Itinerary = z.output<typeof itinerarySchema>
export type Trip = z.output<typeof tripSchema>
