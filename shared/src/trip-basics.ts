import { z } from 'zod'
import { isIsoDate, tripLengthInDays } from './dates.ts'

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'UAH', 'PLN', 'CZK', 'CHF', 'JPY', 'CAD', 'AUD'] as const

export type Currency = (typeof CURRENCIES)[number]

export const CURRENCY_NAMES: Record<Currency, string> = {
  USD: 'US dollar',
  EUR: 'Euro',
  GBP: 'British pound',
  UAH: 'Ukrainian hryvnia',
  PLN: 'Polish złoty',
  CZK: 'Czech koruna',
  CHF: 'Swiss franc',
  JPY: 'Japanese yen',
  CAD: 'Canadian dollar',
  AUD: 'Australian dollar',
}

export const DEFAULT_CURRENCY: Currency = 'EUR'

export const MAX_TRIP_DAYS = 14

export const LIMITS = {
  destination: { min: 2, max: 100 },
  budget: { max: 10_000_000 },
  travelers: { min: 1, max: 20 },
} as const

export const MESSAGES = {
  destinationRequired: 'Enter a destination',
  destinationLength: `Destination must be ${LIMITS.destination.min}–${LIMITS.destination.max} characters`,
  invalidDate: 'Enter a valid date',
  endBeforeStart: "End date can't be before the start date",
  tripTooLong: `Trips can be at most ${MAX_TRIP_DAYS} days long`,
  budgetFormat: 'Enter an amount like 1500 or 1500.50',
  budgetPositive: 'Budget must be greater than 0',
  budgetDecimals: 'Use at most 2 decimal places',
  budgetMax: 'Budget can be at most 10,000,000',
  currency: 'Choose a currency from the list',
  travelers: `Enter a whole number from ${LIMITS.travelers.min} to ${LIMITS.travelers.max}`,
} as const

/** True when the number has at most two decimal places (tolerant of float noise). */
export function hasAtMostTwoDecimals(value: number) {
  const cents = value * 100
  return Math.abs(cents - Math.round(cents)) < 1e-6
}

/** Error for an invalid date range (end before start, or longer than the limit), if any. */
export function dateRangeError(startDate: string, endDate: string) {
  const days = tripLengthInDays(startDate, endDate)
  if (days < 1) return MESSAGES.endBeforeStart
  if (days > MAX_TRIP_DAYS) return MESSAGES.tripTooLong
  return undefined
}

/** Run a date-range refinement as soon as both dates are valid, even if other fields are not. */
export function whenBothDatesValid({ value }: { value: unknown }) {
  const dates = value as { startDate?: unknown; endDate?: unknown } | undefined
  return isIsoDate(dates?.startDate) && isIsoDate(dates?.endDate)
}

const isoDate = z.string({ error: MESSAGES.invalidDate }).refine(isIsoDate, MESSAGES.invalidDate)

/** Normalized trip basics, as sent between the client and the server. */
export const tripBasicsSchema = z
  .object({
    destination: z
      .string({ error: MESSAGES.destinationRequired })
      .trim()
      .min(1, MESSAGES.destinationRequired)
      .min(LIMITS.destination.min, MESSAGES.destinationLength)
      .max(LIMITS.destination.max, MESSAGES.destinationLength),
    startDate: isoDate,
    endDate: isoDate,
    budget: z
      .number({ error: MESSAGES.budgetFormat })
      .positive(MESSAGES.budgetPositive)
      .max(LIMITS.budget.max, MESSAGES.budgetMax)
      .refine(hasAtMostTwoDecimals, MESSAGES.budgetDecimals),
    currency: z.enum(CURRENCIES, { error: MESSAGES.currency }),
    travelers: z
      .number({ error: MESSAGES.travelers })
      .int(MESSAGES.travelers)
      .min(LIMITS.travelers.min, MESSAGES.travelers)
      .max(LIMITS.travelers.max, MESSAGES.travelers),
  })
  .superRefine(
    ({ startDate, endDate }, ctx) => {
      const message = dateRangeError(startDate, endDate)
      if (message) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message })
      }
    },
    { when: whenBothDatesValid },
  )

export type TripBasics = z.infer<typeof tripBasicsSchema>
