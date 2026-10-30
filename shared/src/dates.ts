import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** True for a real calendar date written as YYYY-MM-DD (rejects e.g. 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    return false
  }
  const date = parseISO(value)
  return isValid(date) && format(date, 'yyyy-MM-dd') === value
}

/** Number of days a trip covers, counting both the start and the end date. */
export function tripLengthInDays(startDate: string, endDate: string) {
  return differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1
}

/** Every date of a trip as YYYY-MM-DD, from the start to the end date inclusive. */
export function tripDates(startDate: string, endDate: string) {
  const start = parseISO(startDate)
  return Array.from({ length: Math.max(tripLengthInDays(startDate, endDate), 0) }, (_, index) =>
    format(addDays(start, index), 'yyyy-MM-dd'),
  )
}
