import { afterEach, describe, expect, it, vi } from 'vitest'
import { hangingFetch, jsonResponse, mockFetch, requestBody } from '../test/fetchMock.ts'
import { fixturePreferences, tripFixture } from '../test/tripFixture.ts'
import { CLIENT_TIMEOUT_MS, generateItinerary } from './itineraries.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('generateItinerary', () => {
  it('sends the preferences to the generate endpoint and returns the trip', async () => {
    const trip = tripFixture()
    const fetchMock = mockFetch(async () => jsonResponse(200, { data: { trip } }))
    await expect(generateItinerary(fixturePreferences)).resolves.toEqual({ ok: true, data: trip })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/itineraries/generate')
    expect(requestBody(fetchMock)).toEqual(fixturePreferences)
  })

  it('rejects a success body that fails the trip schema', async () => {
    const trip = { ...tripFixture(), itinerary: { days: [] } }
    mockFetch(async () => jsonResponse(200, { data: { trip } }))
    await expect(generateItinerary(fixturePreferences)).resolves.toEqual({
      ok: false,
      error: { kind: 'invalid-response' },
    })
  })

  it('times out after 90 seconds', async () => {
    vi.useFakeTimers()
    mockFetch(hangingFetch)
    const result = generateItinerary(fixturePreferences)
    expect(CLIENT_TIMEOUT_MS).toBe(90_000)
    await vi.advanceTimersByTimeAsync(CLIENT_TIMEOUT_MS)
    await expect(result).resolves.toEqual({ ok: false, error: { kind: 'timeout' } })
  })
})
