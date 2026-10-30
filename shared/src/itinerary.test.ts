import { describe, expect, it } from 'vitest'
import { activitySchema, daySchema, itinerarySchema, tripSchema } from './itinerary.ts'

let nextId = 0
/** A distinct, valid v4 UUID per call. */
const randomUUID = () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`

function activity(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    title: 'Tram 28 ride',
    description: 'A classic loop through Alfama.',
    category: 'sightseeing',
    startTime: '09:30',
    durationMinutes: 60,
    estimatedCost: 6.4,
    currency: 'EUR',
    ...overrides,
  }
}

function day(dayNumber: number, date: string, activities = [activity()]) {
  return { id: randomUUID(), dayNumber, date, title: `Day ${dayNumber}`, activities }
}

function trip(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    createdAt: '2026-10-27T10:00:00.000Z',
    preferences: {
      destination: 'Lisbon',
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      budget: 1500,
      currency: 'EUR',
      travelers: 2,
      travelStyle: 'food',
      pace: 'relaxed',
      interests: ['wine'],
    },
    itinerary: {
      days: [day(1, '2026-11-10'), day(2, '2026-11-11'), day(3, '2026-11-12')],
    },
    ...overrides,
  }
}

describe('activitySchema', () => {
  it('accepts a valid activity, including a free one with no description', () => {
    expect(activitySchema.safeParse(activity()).success).toBe(true)
    expect(activitySchema.safeParse(activity({ estimatedCost: 0, description: '' })).success).toBe(true)
  })

  it.each([
    ['a start time past 23:59', { startTime: '25:00' }],
    ['a one-digit hour', { startTime: '9:30' }],
    ['a duration under 5 minutes', { durationMinutes: 3 }],
    ['a duration over a day', { durationMinutes: 1441 }],
    ['a fractional duration', { durationMinutes: 30.5 }],
    ['a negative cost', { estimatedCost: -1 }],
    ['a cost with 3 decimals', { estimatedCost: 12.345 }],
    ['an empty title', { title: '   ' }],
    ['a title over 120 characters', { title: 'x'.repeat(121) }],
    ['a description over 1000 characters', { description: 'x'.repeat(1001) }],
    ['an unknown category', { category: 'museum' }],
    ['an unknown currency', { currency: 'BTC' }],
    ['a non-UUID id', { id: 'a1' }],
  ])('rejects %s', (_, overrides) => {
    expect(activitySchema.safeParse(activity(overrides)).success).toBe(false)
  })
})

describe('daySchema', () => {
  it('accepts activities in time order, ties included, and an empty day', () => {
    const sorted = [activity({ startTime: '09:00' }), activity({ startTime: '09:00' }), activity({ startTime: '14:00' })]
    expect(daySchema.safeParse(day(1, '2026-11-10', sorted)).success).toBe(true)
    expect(daySchema.safeParse(day(1, '2026-11-10', [])).success).toBe(true)
  })

  it('rejects activities that are not sorted by start time', () => {
    const unsorted = [activity({ startTime: '14:00' }), activity({ startTime: '09:30' })]
    expect(daySchema.safeParse(day(1, '2026-11-10', unsorted)).success).toBe(false)
  })
})

describe('itinerarySchema', () => {
  it('rejects a gap in day numbers', () => {
    const days = [day(1, '2026-11-10'), day(3, '2026-11-11')]
    expect(itinerarySchema.safeParse({ days }).success).toBe(false)
  })

  it('rejects a gap in dates', () => {
    const days = [day(1, '2026-11-10'), day(2, '2026-11-12')]
    expect(itinerarySchema.safeParse({ days }).success).toBe(false)
  })

  it('rejects an empty itinerary', () => {
    expect(itinerarySchema.safeParse({ days: [] }).success).toBe(false)
  })
})

describe('tripSchema', () => {
  it('accepts a valid trip', () => {
    expect(tripSchema.safeParse(trip()).success).toBe(true)
  })

  it('rejects days that do not cover the trip dates', () => {
    const shortItinerary = { days: [day(1, '2026-11-10'), day(2, '2026-11-11')] }
    expect(tripSchema.safeParse(trip({ itinerary: shortItinerary })).success).toBe(false)
    const shifted = { days: [day(1, '2026-11-11'), day(2, '2026-11-12'), day(3, '2026-11-13')] }
    expect(tripSchema.safeParse(trip({ itinerary: shifted })).success).toBe(false)
  })

  it('rejects an activity in another currency', () => {
    const itinerary = {
      days: [day(1, '2026-11-10', [activity({ currency: 'USD' })]), day(2, '2026-11-11'), day(3, '2026-11-12')],
    }
    expect(tripSchema.safeParse(trip({ itinerary })).success).toBe(false)
  })

  it('rejects a bad id or timestamp', () => {
    expect(tripSchema.safeParse(trip({ id: 'trip-1' })).success).toBe(false)
    expect(tripSchema.safeParse(trip({ createdAt: '27.10.2026' })).success).toBe(false)
  })
})
