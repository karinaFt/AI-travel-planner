// Isomorphic code shared by the client and (later) the server.
export { isIsoDate, tripLengthInDays } from './dates.ts'
export {
  CURRENCIES,
  CURRENCY_NAMES,
  DEFAULT_CURRENCY,
  LIMITS,
  MAX_TRIP_DAYS,
  MESSAGES,
  dateRangeError,
  hasAtMostTwoDecimals,
  tripBasicsSchema,
  whenBothDatesValid,
  type Currency,
  type TripBasics,
} from './trip-basics.ts'
