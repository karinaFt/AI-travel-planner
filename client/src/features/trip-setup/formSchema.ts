import {
  DEFAULT_CURRENCY,
  MESSAGES,
  dateRangeError,
  tripBasicsSchema,
  whenBothDatesValid,
} from '@travel-planner/shared'
import { format } from 'date-fns'
import { z } from 'zod'

export const START_IN_PAST_MESSAGE = "Start date can't be in the past"

/** Raw values as the inputs hold them: every field is a string. */
export type TripBasicsFormValues = {
  destination: string
  startDate: string
  endDate: string
  budget: string
  currency: string
  travelers: string
}

export const emptyTripBasicsForm: TripBasicsFormValues = {
  destination: '',
  startDate: '',
  endDate: '',
  budget: '',
  currency: DEFAULT_CURRENCY,
  travelers: '1',
}

// A plain decimal with an optional minus sign. Signs and decimals are allowed here so the
// shared rules can give the specific message ("greater than 0", "2 decimal places");
// anything else (1e5, Infinity, 12,5,0, +3) is not a number for this form.
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/

function numberFromText(formatMessage: string) {
  return z.string().trim().regex(PLAIN_NUMBER, formatMessage).transform(Number)
}

const wire = tripBasicsSchema.shape

/** Validates the raw form strings and outputs normalized `TripBasics`. */
export const tripBasicsFormSchema = z
  .object({
    destination: wire.destination,
    startDate: wire.startDate,
    endDate: wire.endDate,
    budget: numberFromText(MESSAGES.budgetFormat).pipe(wire.budget),
    currency: z.string().pipe(wire.currency),
    travelers: numberFromText(MESSAGES.travelers).pipe(wire.travelers),
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
