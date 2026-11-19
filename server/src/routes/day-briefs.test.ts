import {
  ERROR_CODES,
  apiErrorBodySchema,
  dayBriefResultSchema,
  type ApiErrorCode,
} from '@travel-planner/shared'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDS, goodAnswer, lisbonDay } from '../ai/brief-test-data.ts'
import type { ItineraryModel } from '../ai/model.ts'
import { createApp, type AppOptions } from '../app.ts'
import { loadConfig } from '../config.ts'
import { AppError } from '../http/errors.ts'
import { createLogger } from '../http/logger.ts'
import type { FindPhoto } from '../photos/wikipedia.ts'

const API_KEY = 'secret-gemini-key-123'
const PHOTO = {
  url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Tower.jpg',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tower.jpg',
}
const goodText = JSON.stringify(goodAnswer)

let lines: string[]

beforeEach(() => {
  lines = []
})

/** A model whose calls stay pending until the test settles them. */
function deferredModel() {
  const pending: { request: Parameters<ItineraryModel['generate']>[0]; resolve: (text: string) => void; reject: (e: unknown) => void }[] = []
  const generate = vi.fn<ItineraryModel['generate']>(
    (req) => new Promise<string>((resolve, reject) => void pending.push({ request: req, resolve, reject })),
  )
  return { generate, pending }
}

const answering = (text: string): ItineraryModel => ({ generate: vi.fn(async () => text) })

function app(model: ItineraryModel | undefined, options: Partial<AppOptions> = {}) {
  return createApp({
    config: loadConfig({ GEMINI_API_KEY: API_KEY }),
    log: createLogger((line) => lines.push(line)),
    itineraryModel: model,
    findPhoto: async () => PHOTO,
    ...options,
  })
}

const brief = (target: ReturnType<typeof app>, body: unknown = lisbonDay) =>
  request(target).post('/api/days/brief').send(body as object)

function expectError(response: request.Response, code: ApiErrorCode) {
  expect(response.status).toBe(ERROR_CODES[code].status)
  const { error } = apiErrorBodySchema.parse(response.body)
  expect(error.code).toBe(code)
  return error
}

describe('POST /api/days/brief', () => {
  it('answers 200 with blocks that pass the shared schema, mapped to activity IDs, with the photo', async () => {
    const response = await brief(app(answering(goodText)))
    expect(response.status).toBe(200)
    const result = dayBriefResultSchema.parse(response.body.data.brief)
    expect(response.body.data.brief).not.toHaveProperty('basedOn')
    expect(result.blocks.map((b) => b.type)).toEqual(['highlight', 'route', 'tip', 'booking', 'budgetNote'])
    expect(result.blocks[0]).toMatchObject({ activityIds: [IDS[0]], image: PHOTO })
    expect(result.blocks[3]).toMatchObject({ activityIds: [IDS[2]] })
  })

  it('answers 200 without an image when the photo lookup finds nothing', async () => {
    const response = await brief(app(answering(goodText), { findPhoto: async () => null }))
    expect(response.status).toBe(200)
    expect(response.body.data.brief.blocks[0]).not.toHaveProperty('image')
  })

  it('answers 400 VALIDATION_ERROR naming the field, without calling the AI', async () => {
    const model = answering(goodText)
    const error = expectError(await brief(app(model), { ...lisbonDay, activities: [] }), 'VALIDATION_ERROR')
    expect(error.details).toMatchObject({ fields: { activities: expect.any(String) } })

    const long = { ...lisbonDay, activities: [{ ...lisbonDay.activities[0], description: 'x'.repeat(161) }] }
    expectError(await brief(app(model), long), 'VALIDATION_ERROR')
    expect(model.generate).not.toHaveBeenCalled()
  })

  it('answers 503 AI_UNAVAILABLE without an API key, after validation', async () => {
    expectError(await brief(app(undefined)), 'AI_UNAVAILABLE')
    expectError(await brief(app(undefined), { destination: 'L' }), 'VALIDATION_ERROR')
  })

  it('answers 502 AI_INVALID_RESPONSE when no block is usable', async () => {
    const answer = JSON.stringify({ blocks: [{ type: 'tip', text: 'Bad key.', activityKeys: ['a9'] }] })
    expectError(await brief(app(answering(answer))), 'AI_INVALID_RESPONSE')
  })

  it.each(['AI_UNAVAILABLE', 'AI_PROVIDER_ERROR'] as const)('passes on %s from the model', async (code) => {
    const model: ItineraryModel = {
      generate: async () => {
        throw new AppError(code)
      },
    }
    expectError(await brief(app(model)), code)
  })

  it('answers 409 to a second brief while one runs, and frees the slot afterwards', async () => {
    const model = deferredModel()
    const target = app(model)
    const first = brief(target).then((r) => r)
    await vi.waitFor(() => expect(model.generate).toHaveBeenCalledOnce())

    expectError(await brief(target), 'GENERATION_IN_PROGRESS')
    expect(model.generate).toHaveBeenCalledOnce()

    model.pending[0].reject(new AppError('AI_INVALID_RESPONSE'))
    expect((await first).status).toBe(502)

    const next = brief(target).then((r) => r)
    await vi.waitFor(() => expect(model.generate).toHaveBeenCalledTimes(2))
    model.pending[1].resolve(goodText)
    expect((await next).status).toBe(200)
  })

  it('lets a brief and a generation from the same IP run at the same time', async () => {
    const model = deferredModel()
    const target = app(model)
    const generation = request(target)
      .post('/api/itineraries/generate')
      .send({
        destination: 'Lisbon',
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        budget: 500,
        currency: 'EUR',
        travelers: 1,
        travelStyle: 'food',
        pace: 'balanced',
        interests: [],
      })
      .then((r) => r)
    await vi.waitFor(() => expect(model.generate).toHaveBeenCalledOnce())

    const dayBrief = brief(target).then((r) => r)
    await vi.waitFor(() => expect(model.generate).toHaveBeenCalledTimes(2))

    model.pending[1].resolve(goodText)
    expect((await dayBrief).status).toBe(200)
    model.pending[0].reject(new AppError('AI_UNAVAILABLE'))
    expect((await generation).status).toBe(503)
  })

  it('answers 504 AI_TIMEOUT for a slow model, aborts the call and frees the slot', async () => {
    const signals: (AbortSignal | undefined)[] = []
    const model: ItineraryModel = {
      generate: vi.fn((_req, signal) => {
        signals.push(signal)
        return new Promise<string>(() => {})
      }),
    }
    const target = app(model, { generationLimits: { timeoutMs: 50 } })
    expectError(await brief(target), 'AI_TIMEOUT')
    expect(signals[0]?.aborted).toBe(true)
    expectError(await brief(target), 'AI_TIMEOUT')
    expect(model.generate).toHaveBeenCalledTimes(2)
  })

  it('answers the eleventh brief in a minute with 429, and still accepts a generation', async () => {
    const model = answering(goodText)
    const target = app(model)
    for (let i = 0; i < 10; i++) expect((await brief(target)).status).toBe(200)

    const limited = await brief(target)
    expectError(limited, 'RATE_LIMITED')
    expect(Number(limited.headers['retry-after'])).toBeGreaterThanOrEqual(1)
    expect(model.generate).toHaveBeenCalledTimes(10)

    // The generate endpoint counts separately: this reaches validation, not the brief limit.
    const generation = await request(target).post('/api/itineraries/generate').send({})
    expectError(generation, 'VALIDATION_ERROR')
  })

  it('applies the hourly limit', async () => {
    const target = app(answering(goodText), { briefLimits: { perMinute: 100, perHour: 2 } })
    await brief(target)
    await brief(target)
    expectError(await brief(target), 'RATE_LIMITED')
  })

  it('never logs the request body, the model output or the place name', async () => {
    const findPhoto = vi.fn<FindPhoto>(async () => PHOTO)
    await brief(app(answering(goodText), { findPhoto }), { ...lisbonDay, destination: 'Secret Island' })
    expect(findPhoto).toHaveBeenCalledWith('Belém Tower', 'Secret Island', expect.anything())
    const output = lines.join('\n')
    expect(lines).toHaveLength(1)
    for (const text of [API_KEY, 'Secret Island', 'Belém Tower', 'Pastéis', 'reserve a table']) {
      expect(output).not.toContain(text)
    }
  })
})
