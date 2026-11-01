import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_LIMITS,
  LIMITS,
  START_TIME,
  hasAtMostTwoDecimals,
  type Activity,
} from '@travel-planner/shared'
import { z } from 'zod'
import type { ActivityDraft } from './editTrip.ts'

/** Raw values as the inputs hold them: every field is a string. */
export type ActivityFormValues = {
  title: string
  dayId: string
  startTime: string
  durationMinutes: string
  category: string
  estimatedCost: string
  description: string
}

/** What a valid form produces: the day to put the activity on and the activity itself. */
export type ActivityFormOutput = { dayId: string; draft: ActivityDraft }

const { title, description, durationMinutes } = ACTIVITY_LIMITS

export const ACTIVITY_MESSAGES = {
  titleRequired: 'Enter a title',
  titleLength: `Title can be at most ${title.max} characters`,
  day: 'Choose a day',
  startTime: 'Enter a 24-hour time like 09:30',
  duration: `Enter whole minutes from ${durationMinutes.min} to ${durationMinutes.max}`,
  category: 'Choose a category',
  costFormat: 'Enter an amount like 25 or 25.50',
  costDecimals: 'Use at most 2 decimal places',
  costMax: 'Cost can be at most 10,000,000',
  descriptionLength: `Description can be at most ${description.max} characters`,
} as const

// Digits with an optional decimal part; signs, exponents and commas are not amounts here.
const AMOUNT = /^\d+(\.\d+)?$/
const WHOLE = /^\d+$/

export const activityFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(title.min, ACTIVITY_MESSAGES.titleRequired)
      .max(title.max, ACTIVITY_MESSAGES.titleLength),
    dayId: z.string().min(1, ACTIVITY_MESSAGES.day),
    startTime: z.string().trim().regex(START_TIME, ACTIVITY_MESSAGES.startTime),
    durationMinutes: z
      .string()
      .trim()
      .regex(WHOLE, ACTIVITY_MESSAGES.duration)
      .transform(Number)
      .pipe(z.number().min(durationMinutes.min, ACTIVITY_MESSAGES.duration).max(durationMinutes.max, ACTIVITY_MESSAGES.duration)),
    category: z.string().pipe(z.enum(ACTIVITY_CATEGORIES, ACTIVITY_MESSAGES.category)),
    estimatedCost: z
      .string()
      .trim()
      .regex(AMOUNT, ACTIVITY_MESSAGES.costFormat)
      .transform(Number)
      .pipe(
        z
          .number()
          .refine(hasAtMostTwoDecimals, ACTIVITY_MESSAGES.costDecimals)
          .refine((cost) => cost <= LIMITS.budget.max, ACTIVITY_MESSAGES.costMax),
      ),
    description: z.string().trim().max(description.max, ACTIVITY_MESSAGES.descriptionLength),
  })
  .transform(({ dayId, ...draft }): ActivityFormOutput => ({ dayId, draft }))

/** Starting values for a new activity on `dayId`. */
export function newActivityValues(dayId: string): ActivityFormValues {
  return {
    title: '',
    dayId,
    startTime: '',
    durationMinutes: '60',
    category: 'other',
    estimatedCost: '',
    description: '',
  }
}

/** Starting values for editing `activity`, which is on `dayId`. */
export function activityValues(activity: Activity, dayId: string): ActivityFormValues {
  return {
    title: activity.title,
    dayId,
    startTime: activity.startTime,
    durationMinutes: String(activity.durationMinutes),
    category: activity.category,
    estimatedCost: String(activity.estimatedCost),
    description: activity.description,
  }
}
