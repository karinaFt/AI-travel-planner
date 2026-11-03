import { tripSchema, type Trip } from '@travel-planner/shared'

/** Where saved trips live in `localStorage`. */
export const TRIPS_KEY = 'ai-travel-planner:trips'
/** Unreadable data is copied to a key with this prefix and the time before the main key is written again. */
export const BACKUP_KEY_PREFIX = `${TRIPS_KEY}:backup:`
const VERSION = 1

/** The part of `Storage` the repository uses, so tests can pass a fake. */
export type TripStorage = Pick<Storage, 'getItem' | 'setItem'>

/**
 * Unreadable stored data: the raw text when the whole value is broken, or the entries that failed
 * `tripSchema`. `null` when everything was readable.
 */
export type InvalidData = string | unknown[] | null

export type ReadResult = { trips: Trip[]; invalid: InvalidData }

/** Reads saved trips. Never throws: anything unreadable is returned in `invalid`, not dropped. */
export function readTrips(storage: TripStorage): ReadResult {
  let raw: string | null
  try {
    raw = storage.getItem(TRIPS_KEY)
  } catch {
    return { trips: [], invalid: null }
  }
  if (raw === null) return { trips: [], invalid: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { trips: [], invalid: raw }
  }
  if (!isStoredData(parsed)) return { trips: [], invalid: raw }

  const trips: Trip[] = []
  const invalid: unknown[] = []
  const ids = new Set<string>()
  for (const entry of parsed.trips) {
    const result = tripSchema.safeParse(entry)
    // The first trip with an ID wins; a later duplicate is set aside like any other unreadable entry.
    if (result.success && !ids.has(result.data.id)) {
      ids.add(result.data.id)
      trips.push(result.data)
    } else {
      invalid.push(entry)
    }
  }
  return { trips, invalid: invalid.length > 0 ? invalid : null }
}

function isStoredData(value: unknown): value is { version: 1; trips: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    value.version === VERSION &&
    'trips' in value &&
    Array.isArray(value.trips)
  )
}

/**
 * Writes `trips`, backing up `invalid` first. When the backup can't be written, the main key is left as it is,
 * so unreadable data is never lost. Never throws.
 */
export function writeTrips(
  storage: TripStorage,
  trips: readonly Trip[],
  invalid: InvalidData,
  now: () => Date = () => new Date(),
): 'saved' | 'failed' {
  try {
    if (invalid !== null) {
      const backup = typeof invalid === 'string' ? invalid : JSON.stringify(invalid)
      storage.setItem(`${BACKUP_KEY_PREFIX}${now().toISOString()}`, backup)
    }
    storage.setItem(TRIPS_KEY, JSON.stringify({ version: VERSION, trips }))
    return 'saved'
  } catch {
    // Quota errors differ between browsers (QuotaExceededError, code 22, NS_ERROR_DOM_QUOTA_REACHED),
    // and blocked storage throws too, so every error is a failed save.
    return 'failed'
  }
}
