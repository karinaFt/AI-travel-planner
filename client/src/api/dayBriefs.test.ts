import { afterEach, describe, expect, it, vi } from 'vitest'
import { hangingFetch, jsonResponse, mockFetch, requestBody } from '../test/fetchMock.ts'
import { fixturePreferences, tripFixture } from '../test/tripFixture.ts'
import { createDayBrief, dayBriefRequest } from './dayBriefs.ts'
import { CLIENT_TIMEOUT_MS } from './itineraries.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const trip = tripFixture({
  days: [
    [
      { title: 'Castle', description: 'x'.repeat(400), category: 'sightseeing', startTime: '09:30', durationMinutes: 90, estimatedCost: 15 },
      { title: 'Lunch', description: 'Fish.', category: 'food', startTime: '13:00', durationMinutes: 60, estimatedCost: 40 },
    ],
  ],
})
const day = trip.itinerary.days[0]
const result = { blocks: [{ type: 'tip', text: 'Go early.', activityIds: [] }], generatedAt: '2026-11-09T10:00:00.000Z' }

describe('dayBriefRequest', () => {
  it('sends the trip context, the day and its activities, with descriptions cut to 160 characters', () => {
    const request = dayBriefRequest(fixturePreferences, day)
    expect(request).toMatchObject({
      destination: 'Lisbon',
      currency: 'EUR',
      travelers: 2,
      travelStyle: 'food',
      pace: 'relaxed',
      interests: ['wine', 'markets'],
      day: { dayNumber: 1, date: '2026-11-10', title: 'Day title 1' },
    })
    expect(request).not.toHaveProperty('budget')
    expect(request.activities.map((a) => a.title)).toEqual(['Castle', 'Lunch'])
    expect(request.activities[0].description).toBe('x'.repeat(160))
    expect(request.activities[0]).not.toHaveProperty('currency')
  })
})

describe('createDayBrief', () => {
  it('posts to the brief endpoint and returns the checked result', async () => {
    const fetchMock = mockFetch(async () => jsonResponse(200, { data: { brief: result } }))
    const request = dayBriefRequest(fixturePreferences, day)
    await expect(createDayBrief(request)).resolves.toEqual({ ok: true, data: result })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/days/brief')
    expect(requestBody(fetchMock)).toEqual(request)
  })

  it('rejects a body with an invalid block', async () => {
    mockFetch(async () => jsonResponse(200, { data: { brief: { ...result, blocks: [{ type: 'map' }] } } }))
    await expect(createDayBrief(dayBriefRequest(fixturePreferences, day))).resolves.toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    })
  })

  it('times out after 90 seconds', async () => {
    vi.useFakeTimers()
    mockFetch(hangingFetch)
    const pending = createDayBrief(dayBriefRequest(fixturePreferences, day))
    await vi.advanceTimersByTimeAsync(CLIENT_TIMEOUT_MS)
    await expect(pending).resolves.toEqual({ ok: false, error: { kind: 'timeout' } })
  })
})
