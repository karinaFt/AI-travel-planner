import type { Trip } from '@travel-planner/shared'
import { describe, expect, it, vi } from 'vitest'
import { FakeStorage } from '../../test/fakeStorage.ts'
import { tripFixture } from '../../test/tripFixture.ts'
import { TRIP_LIMIT, createTripStore } from './createTripStore.ts'
import { BACKUP_KEY_PREFIX, TRIPS_KEY, readTrips, writeTrips } from './tripRepository.ts'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function trip(n: number, destination = `City ${n}`): Trip {
  const base = tripFixture({ id: uuid(n) })
  return {
    ...base,
    createdAt: new Date(Date.UTC(2026, 9, 1) + n * 60_000).toISOString(),
    preferences: { ...base.preferences, destination },
  }
}

const lisbon = trip(1, 'Lisbon')
const porto = trip(2, 'Porto')

function storageWith(trips: readonly Trip[]) {
  const storage = new FakeStorage()
  writeTrips(storage, trips, null)
  return storage
}

/** Another tab writes `trips`; the event reaches this tab's store. */
function otherTabWrites(storage: FakeStorage, store: ReturnType<typeof createTripStore>, trips: readonly Trip[]) {
  writeTrips(storage, trips, null)
  store.handleStorageChange(TRIPS_KEY)
}

describe('createTripStore', () => {
  it('loads saved trips, newest first', () => {
    const store = createTripStore(storageWith([lisbon, porto]))
    expect(store.list().map((t) => t.preferences.destination)).toEqual(['Porto', 'Lisbon'])
    expect(store.get(lisbon.id)).toEqual(lisbon)
    expect(store.skipped).toBe(0)
    expect(store.available).toBe(true)
  })

  it('saves a trip to storage and notifies listeners', () => {
    const storage = new FakeStorage()
    const store = createTripStore(storage)
    const listener = vi.fn()
    store.subscribe(listener)

    expect(store.save(lisbon)).toBe('saved')

    expect(readTrips(storage).trips).toEqual([lisbon])
    expect(store.get(lisbon.id)).toBe(lisbon)
    expect(listener).toHaveBeenCalled()
  })

  it('keeps the same list until the trips change', () => {
    const store = createTripStore(storageWith([lisbon]))
    const before = store.list()
    store.save(store.get(lisbon.id)!)
    expect(store.list()).toBe(before)
    store.save({ ...lisbon, preferences: { ...lisbon.preferences, budget: 900 } })
    expect(store.list()).not.toBe(before)
  })

  it('keeps trips another tab saved when it writes', () => {
    const storage = new FakeStorage()
    const store = createTripStore(storage)
    writeTrips(storage, [porto], null) // another tab, no event yet

    store.save(lisbon)

    expect(readTrips(storage).trips.map((t) => t.preferences.destination)).toEqual(['Porto', 'Lisbon'])
  })

  it('replaces an edited trip in place', () => {
    const storage = storageWith([lisbon, porto])
    const store = createTripStore(storage)
    const edited = { ...lisbon, preferences: { ...lisbon.preferences, budget: 900 } }

    store.save(edited)

    expect(readTrips(storage).trips).toEqual([edited, porto])
  })

  describe('trip limit', () => {
    const full = Array.from({ length: TRIP_LIMIT }, (_, i) => trip(10 + i))

    it('refuses a new trip at the limit but keeps it for the tab', () => {
      const storage = storageWith(full)
      const store = createTripStore(storage)

      expect(store.save(lisbon)).toBe('limit')

      expect(store.unsavedReason(lisbon.id)).toBe('limit')
      expect(store.get(lisbon.id)).toBe(lisbon)
      expect(readTrips(storage).trips).toHaveLength(TRIP_LIMIT)
    })

    it('still saves edits of saved trips at the limit', () => {
      const storage = storageWith(full)
      const store = createTripStore(storage)
      const edited = { ...full[0], preferences: { ...full[0].preferences, budget: 900 } }

      expect(store.save(edited)).toBe('saved')
      expect(readTrips(storage).trips[0]).toEqual(edited)
    })
  })

  it('marks a trip unsaved when the write fails and clears it after a later save', () => {
    const storage = new FakeStorage()
    const store = createTripStore(storage)
    storage.failWrites = () => true

    expect(store.save(lisbon)).toBe('failed')
    expect(store.unsavedReason(lisbon.id)).toBe('failed')
    expect(store.get(lisbon.id)).toBe(lisbon)

    storage.failWrites = false
    expect(store.save(lisbon)).toBe('saved')
    expect(store.unsavedReason(lisbon.id)).toBeUndefined()
  })

  it('works in memory without storage', () => {
    const store = createTripStore(null)
    expect(store.available).toBe(false)
    expect(store.save(lisbon)).toBe('failed')
    expect(store.list()).toEqual([lisbon])
    expect(store.remove(lisbon.id)).toBe('removed')
    expect(store.list()).toEqual([])
  })

  it('removes a trip from storage and memory', () => {
    const storage = storageWith([lisbon, porto])
    const store = createTripStore(storage)

    expect(store.remove(lisbon.id)).toBe('removed')

    expect(store.list()).toEqual([porto])
    expect(readTrips(storage).trips).toEqual([porto])
  })

  it('keeps a trip when removing it from storage fails', () => {
    const storage = storageWith([lisbon])
    const store = createTripStore(storage)
    storage.failWrites = () => true

    expect(store.remove(lisbon.id)).toBe('failed')
    expect(store.list()).toEqual([lisbon])
  })

  describe('invalid data', () => {
    it('counts skipped entries and backs them up on the next write', () => {
      const storage = new FakeStorage()
      storage.setItem(TRIPS_KEY, JSON.stringify({ version: 1, trips: [porto, { id: 'broken' }] }))
      const store = createTripStore(storage)
      expect(store.skipped).toBe(1)
      expect(store.list()).toEqual([porto])

      store.save(porto)

      const [backupKey] = storage.keys(BACKUP_KEY_PREFIX)
      expect(JSON.parse(storage.getItem(backupKey)!)).toEqual([{ id: 'broken' }])
      expect(readTrips(storage)).toEqual({ trips: [porto], invalid: null })
    })

    it('reports a broken value as "all"', () => {
      const storage = new FakeStorage()
      storage.setItem(TRIPS_KEY, '{not json')
      expect(createTripStore(storage).skipped).toBe('all')
    })
  })

  describe('changes from other tabs', () => {
    it('picks up added trips without counting a revision', () => {
      const storage = storageWith([lisbon])
      const store = createTripStore(storage)
      const listener = vi.fn()
      store.subscribe(listener)

      otherTabWrites(storage, store, [lisbon, porto])

      expect(store.list().map((t) => t.preferences.destination)).toEqual(['Porto', 'Lisbon'])
      expect(store.externalRevision(porto.id)).toBe(0)
      expect(listener).toHaveBeenCalledOnce()
    })

    it('counts a revision only for the trip that changed', () => {
      const storage = storageWith([lisbon, porto])
      const store = createTripStore(storage)
      const portoBefore = store.get(porto.id)
      const edited = { ...lisbon, preferences: { ...lisbon.preferences, budget: 900 } }

      otherTabWrites(storage, store, [edited, porto])

      expect(store.get(lisbon.id)).toEqual(edited)
      expect(store.externalRevision(lisbon.id)).toBe(1)
      expect(store.externalRevision(porto.id)).toBe(0)
      expect(store.get(porto.id)).toBe(portoBefore)
    })

    it('never counts its own saves as revisions', () => {
      const storage = storageWith([lisbon])
      const store = createTripStore(storage)
      store.save({ ...lisbon, preferences: { ...lisbon.preferences, budget: 900 } })
      store.handleStorageChange(TRIPS_KEY)
      expect(store.externalRevision(lisbon.id)).toBe(0)
    })

    it('sees no change when another tab writes the same trip with its keys in another order', () => {
      const storage = new FakeStorage()
      const store = createTripStore(storage)
      // Like an edited activity, built as { ...draft, id, currency }: same data, other key order.
      const reordered: Trip = {
        ...lisbon,
        itinerary: {
          days: lisbon.itinerary.days.map((day) => ({
            ...day,
            activities: day.activities.map(({ id, currency, ...draft }) => ({ ...draft, id, currency })),
          })),
        },
      }
      store.save(reordered)
      const listener = vi.fn()
      store.subscribe(listener)

      otherTabWrites(storage, store, [lisbon])

      expect(store.externalRevision(lisbon.id)).toBe(0)
      expect(store.get(lisbon.id)).toBe(reordered)
      expect(listener).not.toHaveBeenCalled()
    })

    it('drops trips deleted elsewhere, also when storage was cleared', () => {
      const storage = storageWith([lisbon, porto])
      const store = createTripStore(storage)

      otherTabWrites(storage, store, [porto])
      expect(store.get(lisbon.id)).toBeUndefined()

      storage.items.clear()
      store.handleStorageChange(null)
      expect(store.list()).toEqual([])
    })

    it('keeps a trip this tab could not save', () => {
      const storage = new FakeStorage()
      const store = createTripStore(storage)
      storage.failWrites = () => true
      store.save(lisbon)
      storage.failWrites = false

      otherTabWrites(storage, store, [porto])

      expect(store.get(lisbon.id)).toBe(lisbon)
    })

    it('ignores other keys and unchanged data', () => {
      const storage = storageWith([lisbon])
      const store = createTripStore(storage)
      const listener = vi.fn()
      store.subscribe(listener)

      store.handleStorageChange('something-else')
      store.handleStorageChange(TRIPS_KEY)

      expect(listener).not.toHaveBeenCalled()
    })
  })
})
