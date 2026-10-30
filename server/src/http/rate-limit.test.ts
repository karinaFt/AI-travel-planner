import { ERROR_CODES, apiErrorBodySchema } from '@travel-planner/shared'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ItineraryModel } from '../ai/model.ts'
import { createApp } from '../app.ts'
import { loadConfig } from '../config.ts'
import type { GenerationLimits } from '../protection.ts'
import { AppError } from './errors.ts'
import { createLogger } from './logger.ts'

const lisbon = {
  destination: 'Lisbon',
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  budget: 1500,
  currency: 'EUR',
  travelers: 2,
  travelStyle: 'food',
  pace: 'relaxed',
  interests: [],
}

let lines: string[]
let model: { generate: ReturnType<typeof vi.fn<ItineraryModel['generate']>> }

beforeEach(() => {
  lines = []
  // Answers at once; the outcome doesn't matter here, only that the request reached the AI.
  model = {
    generate: vi.fn<ItineraryModel['generate']>(async () => Promise.reject(new AppError('AI_INVALID_RESPONSE'))),
  }
})

function app({ env = {}, limits }: { env?: Record<string, string>; limits?: Partial<GenerationLimits> } = {}) {
  return createApp({
    config: loadConfig(env),
    log: createLogger((line) => lines.push(line)),
    itineraryModel: model,
    generationLimits: limits,
  })
}

const generate = (target: ReturnType<typeof app>, forwardedFor?: string) => {
  const req = request(target).post('/api/itineraries/generate')
  if (forwardedFor) req.set('X-Forwarded-For', forwardedFor)
  return req.send(lisbon)
}

async function sendMany(target: ReturnType<typeof app>, count: number, forwardedFor?: string) {
  for (let i = 0; i < count; i++) await generate(target, forwardedFor)
}

function expectRateLimited(response: request.Response) {
  expect(response.status).toBe(ERROR_CODES.RATE_LIMITED.status)
  expect(apiErrorBodySchema.parse(response.body).error.code).toBe('RATE_LIMITED')
  expect(Number(response.headers['retry-after'])).toBeGreaterThanOrEqual(1)
}

describe('generation rate limit', () => {
  it('answers the sixth request in a minute with 429 and Retry-After, without calling the AI', async () => {
    const target = app()
    await sendMany(target, 5)
    expect(model.generate).toHaveBeenCalledTimes(5)

    const response = await generate(target)
    expectRateLimited(response)
    expect(Number(response.headers['retry-after'])).toBeLessThanOrEqual(60)
    expect(response.headers['ratelimit']).toContain('r=0')
    expect(model.generate).toHaveBeenCalledTimes(5)
    expect(JSON.parse(lines.at(-1)!)).toMatchObject({ status: 429, code: 'RATE_LIMITED' })
  })

  it('counts malformed requests too', async () => {
    const target = app()
    for (let i = 0; i < 5; i++) {
      const response = await request(target)
        .post('/api/itineraries/generate')
        .set('Content-Type', 'application/json')
        .send('{"destination":')
      expect(response.status).toBe(400)
    }
    expectRateLimited(await generate(target))
    expect(model.generate).not.toHaveBeenCalled()
  })

  it('applies the hourly limit', async () => {
    const target = app({ limits: { perHour: 3 } })
    await sendMany(target, 3)
    expectRateLimited(await generate(target))
    expect(model.generate).toHaveBeenCalledTimes(3)
  })

  it('does not limit other routes or preflight requests', async () => {
    const target = app()
    for (let i = 0; i < 6; i++) {
      await request(target)
        .options('/api/itineraries/generate')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
    }
    await sendMany(target, 5)
    expectRateLimited(await generate(target))

    const health = await request(target).get('/api/health')
    expect(health.status).toBe(200)
    expect(health.body).toEqual({ data: { status: 'ok' } })
  })

  it('keeps a separate limit per client IP behind a trusted proxy', async () => {
    const target = app({ env: { TRUST_PROXY: '1' } })
    await sendMany(target, 5, '203.0.113.7')
    expectRateLimited(await generate(target, '203.0.113.7'))

    const other = await generate(target, '198.51.100.20')
    expect(other.status).not.toBe(429)
    expect(model.generate).toHaveBeenCalledTimes(6)
  })

  it('ignores X-Forwarded-For by default, so it cannot be used to dodge the limit', async () => {
    const target = app()
    for (let i = 0; i < 5; i++) await generate(target, `203.0.113.${i + 1}`)
    expectRateLimited(await generate(target, '198.51.100.20'))
  })
})
