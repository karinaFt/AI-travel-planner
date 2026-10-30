import { ERROR_CODES, apiErrorBodySchema, tripSchema, type ApiErrorCode } from '@travel-planner/shared'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ItineraryModel } from '../ai/model.ts'
import { createApp } from '../app.ts'
import { loadConfig } from '../config.ts'
import { AppError } from '../http/errors.ts'
import { createLogger } from '../http/logger.ts'

const API_KEY = 'secret-gemini-key-123'

const lisbon = {
  destination: 'Lisbon',
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  budget: 1500,
  currency: 'EUR',
  travelers: 2,
  origin: 'Kyiv',
  travelStyle: 'food',
  pace: 'relaxed',
  interests: ['wine', 'markets'],
}

function aiDays(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    title: `Day ${i + 1}`,
    activities: [
      { title: 'Lunch', description: '', category: 'food', startTime: '13:00', durationMinutes: 60, estimatedCost: 40 },
      { title: 'Tram 28', description: '', category: 'tram', startTime: '09:30', durationMinutes: 50, estimatedCost: 6.4 },
    ],
  }))
}

let lines: string[]

/** A fake model resolving with `text`, or rejecting with `error`. */
function fakeModel(result: { text: string } | { error: unknown }) {
  const generate = vi.fn<ItineraryModel['generate']>(async () => {
    if ('error' in result) throw result.error
    return result.text
  })
  return { generate }
}

function app(itineraryModel?: ItineraryModel) {
  return createApp({
    config: loadConfig({ GEMINI_API_KEY: API_KEY }),
    log: createLogger((line) => lines.push(line)),
    itineraryModel,
  })
}

const generate = (target: ReturnType<typeof app>, body: unknown = lisbon) =>
  request(target).post('/api/itineraries/generate').send(body as object)

function expectError(response: request.Response, code: ApiErrorCode) {
  expect(response.status).toBe(ERROR_CODES[code].status)
  const { error } = apiErrorBodySchema.parse(response.body)
  expect(error.code).toBe(code)
  expect(error.requestId).toBe(response.headers['x-request-id'])
  return error
}

beforeEach(() => {
  lines = []
})

describe('POST /api/itineraries/generate', () => {
  it('returns a normalized trip for valid preferences', async () => {
    const model = fakeModel({ text: JSON.stringify({ days: aiDays(3) }) })
    const response = await generate(app(model))

    expect(response.status).toBe(200)
    const trip = tripSchema.parse(response.body.data.trip)
    expect(trip.preferences.destination).toBe('Lisbon')
    expect(trip.itinerary.days).toHaveLength(3)
    expect(trip.itinerary.days[0].activities.map((a) => [a.startTime, a.category, a.currency])).toEqual([
      ['09:30', 'other', 'EUR'],
      ['13:00', 'food', 'EUR'],
    ])
    expect(model.generate).toHaveBeenCalledOnce()
  })

  it('sends the prompt and a schema for exactly the trip length to the model', async () => {
    const model = fakeModel({ text: JSON.stringify({ days: aiDays(3) }) })
    await generate(app(model))
    const [sent] = model.generate.mock.calls[0]
    expect(sent.contents).toContain('"destination": "Lisbon"')
    expect(sent.systemInstruction).toContain('Plan exactly 3 days')
    expect(sent.responseJsonSchema).toMatchObject({ properties: { days: { minItems: 3, maxItems: 3 } } })
  })

  it('returns 400 with field messages and does not call the model', async () => {
    const model = fakeModel({ text: '{}' })
    const { travelStyle: _travelStyle, ...noStyle } = lisbon
    const response = await generate(app(model), { ...noStyle, endDate: '2026-11-08' })

    const error = expectError(response, 'VALIDATION_ERROR')
    const { fields } = error.details as { fields: Record<string, string> }
    expect(fields.endDate).toBe("End date can't be before the start date")
    expect(fields.travelStyle).toBe('Choose a travel style')
    expect(model.generate).not.toHaveBeenCalled()
  })

  it('reports a missing body under "body"', async () => {
    const response = await request(app(fakeModel({ text: '{}' }))).post('/api/itineraries/generate')
    const error = expectError(response, 'VALIDATION_ERROR')
    expect(error.details).toEqual({ fields: { body: expect.any(String) } })
  })

  it('does not reject a start date in the past', async () => {
    const model = fakeModel({ text: JSON.stringify({ days: aiDays(2) }) })
    const response = await generate(app(model), { ...lisbon, startDate: '2020-01-01', endDate: '2020-01-02' })
    expect(response.status).toBe(200)
  })

  it('returns 502 AI_INVALID_RESPONSE for the wrong number of days, without retrying', async () => {
    const model = fakeModel({ text: JSON.stringify({ days: aiDays(2) }) })
    expectError(await generate(app(model)), 'AI_INVALID_RESPONSE')
    expect(model.generate).toHaveBeenCalledOnce()
  })

  it('returns 502 AI_INVALID_RESPONSE for output that is not JSON', async () => {
    expectError(await generate(app(fakeModel({ text: 'Sure! Here is your trip:' }))), 'AI_INVALID_RESPONSE')
  })

  it.each(['AI_UNAVAILABLE', 'AI_PROVIDER_ERROR', 'AI_INVALID_RESPONSE'] as const)(
    'passes the adapter error %s through',
    async (code) => {
      expectError(await generate(app(fakeModel({ error: new AppError(code) }))), code)
    },
  )

  it('returns 503 AI_UNAVAILABLE without a model, while health still works', async () => {
    const target = app(undefined)
    expectError(await generate(target), 'AI_UNAVAILABLE')
    const health = await request(target).get('/api/health')
    expect(health.body).toEqual({ data: { status: 'ok' } })
  })

  it('validates before reporting a missing model', async () => {
    expectError(await generate(app(undefined), { destination: 'L' }), 'VALIDATION_ERROR')
  })

  it('never logs the API key, the request body or the model output', async () => {
    const model = fakeModel({ text: JSON.stringify({ days: aiDays(3) }) })
    await generate(app(model), { ...lisbon, destination: 'Secret Island' })
    const output = lines.join('\n')
    expect(lines).toHaveLength(1)
    expect(output).not.toContain(API_KEY)
    expect(output).not.toContain('Secret Island')
    expect(output).not.toContain('Tram 28')
  })
})
