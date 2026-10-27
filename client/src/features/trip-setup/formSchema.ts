import {
  DEFAULT_CURRENCY,
  DEFAULT_PACE,
  MESSAGES,
  dateRangeError,
  originSchema,
  tripPreferencesSchema,
  whenBothDatesValid,
} from '@travel-planner/shared'
import { format } from 'date-fns'
import { z } from 'zod'

export const START_IN_PAST_MESSAGE = "Start date can't be in the past"

/** Raw values as the inputs hold them: text fields are strings, interests a list. */
export type TripPreferencesFormValues = {
  destination: string
  origin: string
  startDate: string
  endDate: string
  budget: string
  currency: string
  travelers: string
  travelStyle: string
  pace: string
  interests: string[]
}

export const emptyTripPreferencesForm: TripPreferencesFormValues = {
  destination: '',
  origin: '',
  startDate: '',
  endDate: '',
  budget: '',
  currency: DEFAULT_CURRENCY,
  travelers: '1',
  travelStyle: '',
  pace: DEFAULT_PACE,
  interests: [],
}

// A plain decimal with an optional minus sign. Signs and decimals are allowed here so the
// shared rules can give the specific message ("greater than 0", "2 decimal places");
// anything else (1e5, Infinity, 12,5,0, +3) is not a number for this form.
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/

function numberFromText(formatMessage: string) {
  return z.string().trim().regex(PLAIN_NUMBER, formatMessage).transform(Number)
}

const wire = tripPreferencesSchema.shape

/** Validates the raw form values and outputs normalized `TripPreferences`. */
export const tripPreferencesFormSchema = z
  .object({
    destination: wire.destination,
    origin: originSchema,
    startDate: wire.startDate,
    endDate: wire.endDate,
    budget: numberFromText(MESSAGES.budgetFormat).pipe(wire.budget),
    currency: z.string().pipe(wire.currency),
    travelers: numberFromText(MESSAGES.travelers).pipe(wire.travelers),
    // An empty string (nothing chosen) fails the shared enum with its own message.
    travelStyle: z.string().pipe(wire.travelStyle),
    pace: z.string().pipe(wire.pace),
    interests: wire.interests,
  })
  .superRefine(
    ({ startDate, endDate }, ctx) => {
      // Client-only rule: "today" depends on the user's local time zone.
      const today = format(new Date(), 'yyyy-MM-dd')
      if (startDate < today) {
        ctx.addIssue({ code: 'custom', path: ['startDate'], message: START_IN_PAST_MESSAGE })
      }
      const rangeMessage = dateRangeError(startDate, endDate)
      if (rangeMessage) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: rangeMessage })
      }
    },
    { when: whenBothDatesValid },
  )
