// Isomorphic code shared by the client and the server.
export {
  ERROR_CODES,
  apiErrorBodySchema,
  type ApiErrorBody,
  type ApiErrorCode,
  type ApiSuccess,
  type ValidationErrorDetails,
} from './api.ts'
export { isIsoDate, tripDates, tripLengthInDays } from './dates.ts'
export {
  ACTIVITY_CATEGORIES,
  ACTIVITY_LIMITS,
  START_TIME,
  activitySchema,
  daySchema,
  itinerarySchema,
  tripSchema,
  type Activity,
  type ActivityCategory,
  type Day,
  type Itinerary,
  type Trip,
} from './itinerary.ts'
export { subtractMoney, sumMoney } from './money.ts'
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
