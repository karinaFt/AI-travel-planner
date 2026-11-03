import { tripSchema, type Trip } from '@travel-planner/shared'
import { TRIPS_KEY, readTrips, writeTrips, type TripStorage } from './tripRepository.ts'
import type { TripStore, UnsavedReason } from './tripStoreContext.ts'

/** The most trips the app saves. Trips are never deleted to make room. */
export const TRIP_LIMIT = 50

/**
 * A trip store over `storage`, or kept in memory only when `storage` is null.
 *
 * Every write reads the stored trips first and changes only its own trip, so trips other tabs saved are kept.
 */
export function createTripStore(storage: TripStorage | null): TripStore {
  const initial = storage ? readTrips(storage) : { trips: [], invalid: null }
  let trips = new Map(initial.trips.map((trip) => [trip.id, trip]))
  let list = newestFirst(trips)
  const unsaved = new Map<string, UnsavedReason>()
  const revisions = new Map<string, number>()
  const listeners = new Set<() => void>()

  function notify() {
    for (const listener of listeners) listener()
  }

  function setTrips(next: Map<string, Trip>) {
    trips = next
    list = newestFirst(trips)
  }

  function markUnsaved(id: string, reason: UnsavedReason | undefined) {
    if (reason) unsaved.set(id, reason)
    else unsaved.delete(id)
  }

  return {
    get: (id) => trips.get(id),
    list: () => list,
    unsavedReason: (id) => unsaved.get(id),
    externalRevision: (id) => revisions.get(id) ?? 0,
    skipped: initial.invalid === null ? 0 : typeof initial.invalid === 'string' ? 'all' : initial.invalid.length,
    available: storage !== null,

    save(trip) {
      // Memory first, so the trip stays usable in this tab whatever happens to the write.
      if (trips.get(trip.id) !== trip) setTrips(new Map(trips).set(trip.id, trip))

      let result: 'saved' | 'limit' | 'failed' = 'failed'
      if (storage) {
        const stored = readTrips(storage)
        const index = stored.trips.findIndex((saved) => saved.id === trip.id)
        if (index === -1 && stored.trips.length >= TRIP_LIMIT) {
          result = 'limit'
        } else {
          const next = index === -1 ? [...stored.trips, trip] : stored.trips.with(index, trip)
          result = writeTrips(storage, next, stored.invalid)
        }
      }
      markUnsaved(trip.id, result === 'saved' ? undefined : result)
      notify()
      return result
    },

    remove(id) {
      if (storage) {
        const stored = readTrips(storage)
        const next = stored.trips.filter((saved) => saved.id !== id)
        if (next.length !== stored.trips.length && writeTrips(storage, next, stored.invalid) === 'failed') {
          return 'failed'
        }
      }
      const remaining = new Map(trips)
      remaining.delete(id)
      setTrips(remaining)
      unsaved.delete(id)
      notify()
      return 'removed'
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    handleStorageChange(key) {
      // A null key means another tab cleared all of localStorage.
      if (!storage || (key !== null && key !== TRIPS_KEY)) return

      const next = new Map<string, Trip>()
      let changed = false
      for (const trip of readTrips(storage).trips) {
        const current = trips.get(trip.id)
        if (current && sameTrip(current, trip)) {
          // Unchanged: keep the object, so pages showing it don't re-render.
          next.set(trip.id, current)
          continue
        }
        if (current) revisions.set(trip.id, (revisions.get(trip.id) ?? 0) + 1)
        next.set(trip.id, trip)
        changed = true
      }
      for (const [id, trip] of trips) {
        if (next.has(id)) continue
        // A trip this tab couldn't save was never in storage, so its absence there isn't a deletion.
        if (unsaved.has(id)) next.set(id, trip)
        else changed = true
      }
      if (!changed) return
      setTrips(next)
      notify()
    },
  }
}

/**
 * Whether `current` (any trip this tab holds) has the same data as `stored` (read from storage, so already in
 * the schema's key order). `current` goes through the schema too: an edited trip can list the same keys in
 * another order, and comparing raw JSON would see a change that isn't there.
 */
function sameTrip(current: Trip, stored: Trip) {
  return JSON.stringify(tripSchema.parse(current)) === JSON.stringify(stored)
}

function newestFirst(trips: Map<string, Trip>): readonly Trip[] {
  // ISO timestamps in UTC compare correctly as strings.
  return [...trips.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
