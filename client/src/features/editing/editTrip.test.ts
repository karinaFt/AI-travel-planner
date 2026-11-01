import type { Trip } from '@travel-planner/shared'
import { describe, expect, it } from 'vitest'
import { tripFixture, type FixtureActivity } from '../../test/tripFixture.ts'
import { editTrip, type ActivityDraft } from './editTrip.ts'

const draft = (overrides: Partial<ActivityDraft>): ActivityDraft => ({
  title: 'Activity',
  description: '',
  category: 'other',
  startTime: '10:00',
  durationMinutes: 60,
  estimatedCost: 0,
  ...overrides,
})

const NEW_ID = '00000000-0000-4000-8000-999999999999'

const titles = (trip: Trip, dayNumber: number) =>
  trip.itinerary.days[dayNumber - 1].activities.map((activity) => activity.title)

/** Day 1: Walk 10:00, Coffee 10:00, Museum 11:00. Day 2: Lunch 13:00. Day 3: empty. */
const trip = () =>
  tripFixture({
    days: [
      [
        draft({ title: 'Walk' }),
        draft({ title: 'Coffee', estimatedCost: 4.5 }),
        draft({ title: 'Museum', startTime: '11:00' }),
      ],
      [draft({ title: 'Lunch', startTime: '13:00', estimatedCost: 40 })],
      [],
    ],
  })

const activity = (t: Trip, title: string) =>
  t.itinerary.days.flatMap((day) => day.activities).find((a) => a.title === title)!
const dayId = (t: Trip, dayNumber: number) => t.itinerary.days[dayNumber - 1].id

describe('editTrip: add', () => {
  it('adds in start-time order, after activities at the same time, with the action ID and the trip currency', () => {
    const before = trip()
    const after = editTrip(before, { type: 'add', dayId: dayId(before, 1), id: NEW_ID, draft: draft({ title: 'Tram' }) })

    expect(titles(after, 1)).toEqual(['Walk', 'Coffee', 'Tram', 'Museum'])
    expect(activity(after, 'Tram')).toMatchObject({ id: NEW_ID, currency: 'EUR' })
  })

  it('adds to an empty day', () => {
    const before = trip()
    const after = editTrip(before, { type: 'add', dayId: dayId(before, 3), id: NEW_ID, draft: draft({ title: 'Tram' }) })
    expect(titles(after, 3)).toEqual(['Tram'])
  })
})

describe('editTrip: update', () => {
  it('changes the fields and keeps the ID', () => {
    const before = trip()
    const coffee = activity(before, 'Coffee')
    const after = editTrip(before, {
      type: 'update',
      activityId: coffee.id,
      dayId: dayId(before, 1),
      draft: draft({ title: 'Espresso', estimatedCost: 2.5, category: 'food' }),
    })

    expect(activity(after, 'Espresso')).toMatchObject({ id: coffee.id, estimatedCost: 2.5, category: 'food', currency: 'EUR' })
  })

  it('re-sorts when the start time changes', () => {
    const before = trip()
    const after = editTrip(before, {
      type: 'update',
      activityId: activity(before, 'Walk').id,
      dayId: dayId(before, 1),
      draft: draft({ title: 'Walk', startTime: '12:00' }),
    })
    expect(titles(after, 1)).toEqual(['Coffee', 'Museum', 'Walk'])
  })

  it('keeps the place among activities at the same time when the time is unchanged', () => {
    const before = trip()
    const after = editTrip(before, {
      type: 'update',
      activityId: activity(before, 'Walk').id,
      dayId: dayId(before, 1),
      draft: draft({ title: 'Long walk' }),
    })
    expect(titles(after, 1)).toEqual(['Long walk', 'Coffee', 'Museum'])
  })

  it('moves to another day in start-time order and keeps the ID', () => {
    const before = trip()
    const museum = activity(before, 'Museum')
    const after = editTrip(before, {
      type: 'update',
      activityId: museum.id,
      dayId: dayId(before, 2),
      draft: draft({ title: 'Museum', startTime: '11:00' }),
    })

    expect(titles(after, 1)).toEqual(['Walk', 'Coffee'])
    expect(titles(after, 2)).toEqual(['Museum', 'Lunch'])
    expect(activity(after, 'Museum').id).toBe(museum.id)
  })

  it('places a moved activity after activities at the same time', () => {
    const before = trip()
    const after = editTrip(before, {
      type: 'update',
      activityId: activity(before, 'Lunch').id,
      dayId: dayId(before, 1),
      draft: draft({ title: 'Lunch', startTime: '10:00' }),
    })
    expect(titles(after, 1)).toEqual(['Walk', 'Coffee', 'Lunch', 'Museum'])
    expect(titles(after, 2)).toEqual([])
  })
})

describe('editTrip: delete', () => {
  it('removes the activity and leaves the other days untouched', () => {
    const before = trip()
    const after = editTrip(before, { type: 'delete', activityId: activity(before, 'Coffee').id })

    expect(titles(after, 1)).toEqual(['Walk', 'Museum'])
    expect(after.itinerary.days[1]).toBe(before.itinerary.days[1])
    expect(after.itinerary.days[2]).toBe(before.itinerary.days[2])
    expect(after.itinerary.days.map((day) => day.id)).toEqual(before.itinerary.days.map((day) => day.id))
  })
})

describe('editTrip: guards', () => {
  const full = () =>
    tripFixture({
      days: [Array.from({ length: 20 }, (_, i): FixtureActivity => draft({ title: `Stop ${i + 1}` })), [draft({})], []],
    })

  it('returns the same trip for an unknown activity or day', () => {
    const before = trip()
    expect(editTrip(before, { type: 'delete', activityId: NEW_ID })).toBe(before)
    expect(editTrip(before, { type: 'add', dayId: NEW_ID, id: NEW_ID, draft: draft({}) })).toBe(before)
    expect(
      editTrip(before, { type: 'update', activityId: activity(before, 'Walk').id, dayId: NEW_ID, draft: draft({}) }),
    ).toBe(before)
    expect(editTrip(before, { type: 'update', activityId: NEW_ID, dayId: dayId(before, 1), draft: draft({}) })).toBe(
      before,
    )
  })

  it('returns the same trip when a day would hold 21 activities', () => {
    const before = full()
    expect(editTrip(before, { type: 'add', dayId: dayId(before, 1), id: NEW_ID, draft: draft({}) })).toBe(before)
    const other = before.itinerary.days[1].activities[0]
    expect(editTrip(before, { type: 'update', activityId: other.id, dayId: dayId(before, 1), draft: draft({}) })).toBe(
      before,
    )
  })

  it.each([
    ['an empty title', { title: '' }],
    ['a duration over a day', { durationMinutes: 1441 }],
    ['a cost with 3 decimals', { estimatedCost: 12.345 }],
    ['an invalid start time', { startTime: '25:00' }],
  ])('returns the same trip for %s', (_, overrides) => {
    const before = trip()
    expect(editTrip(before, { type: 'add', dayId: dayId(before, 1), id: NEW_ID, draft: draft(overrides) })).toBe(before)
  })

  it('ignores a currency in the draft and uses the trip currency', () => {
    const before = trip()
    const sneaky = { ...draft({ title: 'Tram' }), currency: 'USD' } as ActivityDraft
    const after = editTrip(before, { type: 'add', dayId: dayId(before, 1), id: NEW_ID, draft: sneaky })
    expect(activity(after, 'Tram').currency).toBe('EUR')
  })
})
