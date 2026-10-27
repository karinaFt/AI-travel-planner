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
export {
  DEFAULT_PACE,
  INTEREST_LIMITS,
  ORIGIN_LIMITS,
  PACES,
  PREFERENCE_MESSAGES,
  TRAVEL_STYLES,
  hasInterest,
  interestSchema,
  originSchema,
  tripPreferencesSchema,
  type Pace,
  type TravelStyle,
  type TripPreferences,
} from './trip-preferences.ts'
