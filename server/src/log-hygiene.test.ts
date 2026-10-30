import type { TripPreferences } from '@travel-planner/shared'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ItineraryModel } from './ai/model.ts'
import { buildPrompt } from './ai/prompt.ts'
import { createApp } from './app.ts'
import { loadConfig, startupSummary } from './config.ts'
import { AppError } from './http/errors.ts'
import { createLogger } from './http/logger.ts'
import type { GenerationLimits } from './protection.ts'

// Markers that must never reach any log output.
const DESTINATION = 'Zanzibar-marker-41'
const MODEL_OUTPUT = 'model-output-marker-77'
const PROVIDER_TEXT = 'provider leak marker-93'
const API_KEY = 'key-marker-55'

const preferences: TripPreferences = {
  destination: DESTINATION,
  startDate: '2026-11-10',
  endDate: '2026-11-10',
  budget: 900,
  currency: 'EUR',
  travelers: 1,
  origin: 'origin-marker-12',
  travelStyle: 'culture',
  pace: 'balanced',
  interests: ['interest-marker-30'],
}

const validText = JSON.stringify({
  days: [
    {
      title: `${MODEL_OUTPUT} day`,
      activities: [
        {
          title: `${MODEL_OUTPUT} museum`,
          description: MODEL_OUTPUT,
          category: 'culture',
          startTime: '10:00',
          durationMinutes: 90,
          estimatedCost: 20,
        },
      ],
    },
  ],
})

// The opening of the real system prompt, so a logged prompt would be caught too.
const PROMPT_OPENING = buildPrompt(preferences).systemInstruction.split('.')[0]

let lines: string[]
let consoleCalls: unknown[][]
const spies: ReturnType<typeof vi.spyOn>[] = []

beforeEach(() => {
  lines = []
  consoleCalls = []
  for (const method of ['log', 'warn', 'error', 'info', 'debug'] as const) {
    spies.push(vi.spyOn(console, method).mockImplementation((...args) => void consoleCalls.push(args)))
  }
})

afterEach(() => {
  spies.splice(0).forEach((spy) => spy.mockRestore())
})

function app(generate: ItineraryModel['generate'], limits?: Partial<GenerationLimits>) {
  const config = loadConfig({ GEMINI_API_KEY: API_KEY })
  const log = createLogger((line) => lines.push(line))
  log({ event: 'listening', ...startupSummary(config) })
  return createApp({ config, log, itineraryModel: { generate }, generationLimits: limits })
}

const generate = (target: ReturnType<typeof app>, body: object = preferences) =>
  request(target).post('/api/itineraries/generate').send(body)

function expectCleanLogs(requests: number) {
  const output = [...lines, ...consoleCalls.map((args) => args.map(String).join(' '))].join('\n')
  for (const marker of [DESTINATION, MODEL_OUTPUT, PROVIDER_TEXT, API_KEY, 'origin-marker-12', 'interest-marker-30']) {
    expect(output).not.toContain(marker)
  }
  expect(PROMPT_OPENING.length).toBeGreaterThan(10)
  expect(output).not.toContain(PROMPT_OPENING)
  const requestLines = lines.map((line) => JSON.parse(line)).filter((entry) => entry.path !== undefined)
  expect(requestLines).toHaveLength(requests)
}

describe('log hygiene', () => {
  it('logs no content for a successful generation', async () => {
    const response = await generate(app(async () => validText))
    expect(response.status).toBe(200)
    // The trip itself reaches the client, just not the logs.
    expect(response.text).toContain(MODEL_OUTPUT)
    expectCleanLogs(1)
  })

  it('logs no content for a request that fails validation', async () => {
    const response = await generate(
      app(async () => validText),
      { ...preferences, endDate: '2026-11-01' },
    )
    expect(response.status).toBe(400)
    expectCleanLogs(1)
  })

  it('logs no content for invalid AI output', async () => {
    const response = await generate(app(async () => `{"days": "${MODEL_OUTPUT}"`))
    expect(response.status).toBe(502)
    expectCleanLogs(1)
  })

  it('logs an unexpected model error without its message', async () => {
    const response = await generate(
      app(async () => {
        throw new Error(PROVIDER_TEXT)
      }),
    )
    expect(response.status).toBe(500)
    expect(lines.some((line) => JSON.parse(line).event === 'error')).toBe(true)
    expectCleanLogs(1)
  })

  it('logs no content for a timed-out generation', async () => {
    const response = await generate(
      app(() => new Promise<string>(() => {}), { timeoutMs: 30 }),
    )
    expect(response.status).toBe(504)
    expectCleanLogs(1)
  })

  it('logs no content for a rate-limited request', async () => {
    const target = app(
      async () => {
        throw new AppError('AI_UNAVAILABLE')
      },
      { perMinute: 1 },
    )
    expect((await generate(target)).status).toBe(503)
    expect((await generate(target)).status).toBe(429)
    expectCleanLogs(2)
  })
})
