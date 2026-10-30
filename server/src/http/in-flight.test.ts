import { ERROR_CODES, apiErrorBodySchema } from '@travel-planner/shared'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ItineraryModel } from '../ai/model.ts'
import { createApp } from '../app.ts'
import { loadConfig } from '../config.ts'
import { AppError } from './errors.ts'
import { createInFlightGuard } from './in-flight.ts'
import { createLogger } from './logger.ts'

const lisbon = {
  destination: 'Lisbon',
  startDate: '2026-11-10',
  endDate: '2026-11-11',
  budget: 1500,
  currency: 'EUR',
  travelers: 2,
  travelStyle: 'food',
  pace: 'relaxed',
  interests: [],
}

const validText = JSON.stringify({
  days: [1, 2].map((day) => ({
    title: `Day ${day}`,
    activities: [
      { title: 'Lunch', description: '', category: 'food', startTime: '13:00', durationMinutes: 60, estimatedCost: 40 },
    ],
  })),
})

describe('createInFlightGuard', () => {
  it('lets one holder per key take the slot until it is released', () => {
    const guard = createInFlightGuard()
    const release = guard.tryAcquire('a')
    expect(release).toBeTypeOf('function')
    expect(guard.tryAcquire('a')).toBeUndefined()
    expect(guard.tryAcquire('b')).toBeTypeOf('function')

    release!()
    expect(guard.tryAcquire('a')).toBeTypeOf('function')
  })

  it('ignores a second release, so it cannot free a newer holder', () => {
    const guard = createInFlightGuard()
    const first = guard.tryAcquire('a')!
    first()
    guard.tryAcquire('a')
    first()
    expect(guard.tryAcquire('a')).toBeUndefined()
  })
})

/** A model whose answers the test settles by hand, one call at a time. */
function deferredModel() {
  const pending: { resolve: (text: string) => void; reject: (error: unknown) => void }[] = []
  const generate = vi.fn<ItineraryModel['generate']>(
    () => new Promise<string>((resolve, reject) => pending.push({ resolve, reject })),
  )
  return { generate, pending }
}

let lines: string[]
beforeEach(() => {
  lines = []
})

function app(model: ItineraryModel) {
  return createApp({
    config: loadConfig({ TRUST_PROXY: '1' }),
    log: createLogger((line) => lines.push(line)),
    itineraryModel: model,
  })
}

/** Starts a generate request from `ip`; `.then()` sends it. */
const generate = (target: ReturnType<typeof app>, ip = '203.0.113.7', body: object = lisbon) =>
  request(target).post('/api/itineraries/generate').set('X-Forwarded-For', ip).send(body)

describe('one generation at a time', () => {
  it('answers a second request from the same IP with 409 while the first is running', async () => {
    const model = deferredModel()
    const target = app(model)
    const first = generate(target).then((response) => response)
    await vi.waitFor(() => expect(model.generate).toHaveBeenCalledOnce())

    const second = await generate(target)
    expect(second.status).toBe(ERROR_CODES.GENERATION_IN_PROGRESS.status)
    expect(apiErrorBodySchema.parse(second.body).error.code).toBe('GENERATION_IN_PROGRESS')
    expect(model.generate).toHaveBeenCalledOnce()

    model.pending[0].resolve(validText)
    expect((await first).status).toBe(200)

    const third = generate(target).then((response) => response)
    await vi.waitFor(() => expect(model.generate).toHaveBeenCalledTimes(2))
    model.pending[1].resolve(validText)
    expect((await third).status).toBe(200)
  })

  it('releases the slot when the generation fails', async () => {
    const model = deferredModel()
    const target = app(model)
    const first = generate(target).then((response) => response)
    await vi.waitFor(() => expect(model.generate).toHaveBeenCalledOnce())
    model.pending[0].reject(new AppError('AI_INVALID_RESPONSE'))
    expect((await first).status).toBe(502)

    const next = generate(target).then((response) => response)
    await vi.waitFor(() => expect(model.generate).toHaveBeenCalledTimes(2))
    model.pending[1].resolve(validText)
    expect((await next).status).toBe(200)
  })

  it('does not block other IPs', async () => {
    const model = deferredModel()
    const target = app(model)
    const first = generate(target, '203.0.113.7').then((response) => response)
    await vi.waitFor(() => expect(model.generate).toHaveBeenCalledOnce())

    const other = generate(target, '198.51.100.20').then((response) => response)
    await vi.waitFor(() => expect(model.generate).toHaveBeenCalledTimes(2))
    model.pending.forEach(({ resolve }) => resolve(validText))
    expect((await first).status).toBe(200)
    expect((await other).status).toBe(200)
  })

  it('does not take the slot for an invalid request', async () => {
    const model = deferredModel()
    const target = app(model)
    const first = generate(target).then((response) => response)
    await vi.waitFor(() => expect(model.generate).toHaveBeenCalledOnce())

    // Validation runs first, so an invalid request gets 400, not 409.
    const invalid = await generate(target, '203.0.113.7', { ...lisbon, destination: '' })
    expect(invalid.status).toBe(400)
    model.pending[0].resolve(validText)
    expect((await first).status).toBe(200)
  })
})
