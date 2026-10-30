import { tripSchema, type TripPreferences } from '@travel-planner/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '../http/errors.ts'
import { normalizeTrip, type NormalizeDeps } from './normalize.ts'

const preferences: TripPreferences = {
  destination: 'Lisbon',
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  budget: 1500,
  currency: 'EUR',
  travelers: 2,
  travelStyle: 'food',
  pace: 'relaxed',
  interests: ['wine'],
}

let deps: NormalizeDeps

beforeEach(() => {
  let next = 0
  deps = {
    newId: () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`,
    now: () => new Date('2026-10-27T10:00:00.000Z'),
  }
})

function aiActivity(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Pastéis de Belém',
    description: 'Custard tarts where they were invented.',
    category: 'food',
    startTime: '10:00',
    durationMinutes: 45,
    estimatedCost: 8,
    ...overrides,
  }
}

function aiDays(count: number, activities: unknown[] = [aiActivity()]) {
  return Array.from({ length: count }, (_, i) => ({ title: `Day ${i + 1}`, activities }))
}

const respond = (body: unknown) => normalizeTrip(JSON.stringify(body), preferences, deps)

function expectInvalid(run: () => unknown) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('AI_INVALID_RESPONSE')
    return
  }
  throw new Error('expected AI_INVALID_RESPONSE')
}

describe('normalizeTrip', () => {
  it('builds a valid trip with server-owned IDs, dates, day numbers and timestamp', () => {
    const trip = respond({ days: aiDays(3) })
    expect(tripSchema.safeParse(trip).success).toBe(true)
    expect(trip.id).toBe('00000000-0000-4000-8000-000000000001')
    expect(trip.createdAt).toBe('2026-10-27T10:00:00.000Z')
    expect(trip.preferences).toEqual(preferences)
    expect(trip.itinerary.days.map((day) => [day.dayNumber, day.date])).toEqual([
      [1, '2026-11-10'],
      [2, '2026-11-11'],
      [3, '2026-11-12'],
    ])
    const ids = [trip.id, ...trip.itinerary.days.flatMap((day) => [day.id, ...day.activities.map((a) => a.id)])]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('sorts by start time, maps unknown categories, rounds costs, trims text and sets the trip currency', () => {
    const activities = [
      aiActivity({ title: 'Late lunch', startTime: '14:00' }),
      aiActivity({ title: '  Tram ride  ', startTime: '09:30', category: 'museum', estimatedCost: 12.345 }),
    ]
    const [first, second] = respond({ days: aiDays(3, activities) }).itinerary.days[0].activities
    expect(first).toMatchObject({
      title: 'Tram ride',
      startTime: '09:30',
      category: 'other',
      estimatedCost: 12.35,
      currency: 'EUR',
    })
    expect(second.title).toBe('Late lunch')
  })

  it('keeps the model order for equal start times', () => {
    const activities = [aiActivity({ title: 'A', startTime: '10:00' }), aiActivity({ title: 'B', startTime: '10:00' })]
    const titles = respond({ days: aiDays(3, activities) }).itinerary.days[0].activities.map((a) => a.title)
    expect(titles).toEqual(['A', 'B'])
  })

  it('accepts known categories in any case and pads one-digit hours', () => {
    const activity = respond({ days: aiDays(3, [aiActivity({ category: ' Food ', startTime: '9:05' })]) }).itinerary
      .days[0].activities[0]
    expect(activity.category).toBe('food')
    expect(activity.startTime).toBe('09:05')
  })

  it('ignores IDs, dates and currencies invented by the model', () => {
    const days = aiDays(3, [aiActivity({ id: 'model-id', currency: 'USD' })]).map((day) => ({
      ...day,
      id: 'model-day',
      date: '1999-01-01',
      dayNumber: 7,
    }))
    const day = respond({ days }).itinerary.days[0]
    expect(day).toMatchObject({ dayNumber: 1, date: '2026-11-10' })
    expect(day.id).not.toBe('model-day')
    expect(day.activities[0].id).not.toBe('model-id')
    expect(day.activities[0].currency).toBe('EUR')
  })

  it('rejects text that is not JSON', () => {
    expectInvalid(() => normalizeTrip('Here is your trip: {', preferences, deps))
  })

  it('rejects the wrong number of days', () => {
    expectInvalid(() => respond({ days: aiDays(2) }))
    expectInvalid(() => respond({ days: aiDays(4) }))
  })

  it.each([
    ['a missing days list', { trip: [] }],
    ['an empty title after trimming', { days: aiDays(3, [aiActivity({ title: '   ' })]) }],
    ['a negative cost', { days: aiDays(3, [aiActivity({ estimatedCost: -1 })]) }],
    ['an invalid start time', { days: aiDays(3, [aiActivity({ startTime: '25:00' })]) }],
    ['a fractional duration', { days: aiDays(3, [aiActivity({ durationMinutes: 30.5 })]) }],
    ['a description over 1000 characters', { days: aiDays(3, [aiActivity({ description: 'x'.repeat(1001) })]) }],
    ['a missing field', { days: aiDays(3, [{ title: 'No time' }]) }],
  ])('rejects %s', (_, body) => {
    expectInvalid(() => respond(body))
  })
})
