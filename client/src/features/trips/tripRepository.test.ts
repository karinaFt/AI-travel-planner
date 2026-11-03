import { describe, expect, it } from 'vitest'
import { FakeStorage } from '../../test/fakeStorage.ts'
import { tripFixture } from '../../test/tripFixture.ts'
import { BACKUP_KEY_PREFIX, TRIPS_KEY, readTrips, writeTrips } from './tripRepository.ts'

const lisbon = tripFixture()
const porto = tripFixture({
  id: '00000000-0000-4000-8000-000000000002',
  preferences: { ...lisbon.preferences, destination: 'Porto' },
})
const now = () => new Date('2026-11-03T12:00:00.000Z')
const backupKey = `${BACKUP_KEY_PREFIX}2026-11-03T12:00:00.000Z`

function stored(value: unknown) {
  const storage = new FakeStorage()
  storage.items.set(TRIPS_KEY, typeof value === 'string' ? value : JSON.stringify(value))
  return storage
}

describe('readTrips', () => {
  it('reads nothing when the key is missing', () => {
    expect(readTrips(new FakeStorage())).toEqual({ trips: [], invalid: null })
  })

  it('reads back what writeTrips wrote', () => {
    const storage = new FakeStorage()
    expect(writeTrips(storage, [lisbon, porto], null)).toBe('saved')
    expect(JSON.parse(storage.getItem(TRIPS_KEY)!)).toEqual({ version: 1, trips: [lisbon, porto] })
    expect(readTrips(storage)).toEqual({ trips: [lisbon, porto], invalid: null })
  })

  it.each([
    ['broken JSON', '{not json'],
    ['a value that is not an object', '42'],
    ['an unknown version', JSON.stringify({ version: 2, trips: [] })],
    ['trips that are not an array', JSON.stringify({ version: 1, trips: {} })],
  ])('returns the raw text as invalid for %s', (_, raw) => {
    expect(readTrips(stored(raw))).toEqual({ trips: [], invalid: raw })
  })

  it('skips an entry that fails the trip schema and returns it as invalid', () => {
    const broken = { ...porto, itinerary: undefined }
    expect(readTrips(stored({ version: 1, trips: [lisbon, broken] }))).toEqual({
      trips: [lisbon],
      invalid: [JSON.parse(JSON.stringify(broken))],
    })
  })

  it('keeps the first trip with an ID and sets duplicates aside', () => {
    const duplicate = { ...lisbon, preferences: { ...lisbon.preferences, destination: 'Copy' } }
    expect(readTrips(stored({ version: 1, trips: [lisbon, duplicate] }))).toEqual({
      trips: [lisbon],
      invalid: [duplicate],
    })
  })

  it('reads nothing when getItem throws', () => {
    const storage = new FakeStorage()
    storage.getItem = () => {
      throw new DOMException('Blocked', 'SecurityError')
    }
    expect(readTrips(storage)).toEqual({ trips: [], invalid: null })
  })
})

describe('writeTrips', () => {
  it('backs up raw invalid text before writing', () => {
    const storage = stored('{not json')
    expect(writeTrips(storage, [lisbon], '{not json', now)).toBe('saved')
    expect(storage.getItem(backupKey)).toBe('{not json')
    expect(readTrips(storage).trips).toEqual([lisbon])
  })

  it('backs up invalid entries as a JSON array', () => {
    const storage = new FakeStorage()
    writeTrips(storage, [lisbon], [{ id: 'broken' }], now)
    expect(JSON.parse(storage.getItem(backupKey)!)).toEqual([{ id: 'broken' }])
  })

  it('leaves the main key alone when the backup cannot be written', () => {
    const storage = stored('{not json')
    storage.failWrites = (key) => key.startsWith(BACKUP_KEY_PREFIX)
    expect(writeTrips(storage, [lisbon], '{not json', now)).toBe('failed')
    expect(storage.getItem(TRIPS_KEY)).toBe('{not json')
  })

  it('reports a failed write instead of throwing', () => {
    const storage = new FakeStorage()
    storage.failWrites = () => true
    expect(writeTrips(storage, [lisbon], null)).toBe('failed')
    expect(storage.getItem(TRIPS_KEY)).toBeNull()
  })
})
