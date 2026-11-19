import { ERROR_CODES, type ApiErrorCode } from '@travel-planner/shared'
import { describe, expect, it } from 'vitest'
import { NETWORK_MESSAGE } from '../generation/messages.ts'
import { BRIEF_MESSAGES, describeBriefFailure } from './messages.ts'

const api = (code: ApiErrorCode, retryAfterSeconds?: number) =>
  ({ kind: 'api', code, message: ERROR_CODES[code].message, ...(retryAfterSeconds && { retryAfterSeconds }) }) as const

describe('describeBriefFailure', () => {
  it('counts down a rate limit', () => {
    expect(describeBriefFailure(api('RATE_LIMITED', 40))).toEqual({
      message: 'Too many requests. You can try again in 40 seconds.',
      retryAfterSeconds: 40,
    })
  })

  it.each<[string, Parameters<typeof describeBriefFailure>[0], string]>([
    ['another overview running', api('GENERATION_IN_PROGRESS'), BRIEF_MESSAGES.inProgress],
    ['a busy model', api('AI_UNAVAILABLE'), BRIEF_MESSAGES.busy],
    ['a server timeout', api('AI_TIMEOUT'), BRIEF_MESSAGES.failed],
    ['invalid AI output', api('AI_INVALID_RESPONSE'), BRIEF_MESSAGES.failed],
    ['a provider error', api('AI_PROVIDER_ERROR'), BRIEF_MESSAGES.failed],
    ['an invalid response body', { kind: 'invalid-response' }, BRIEF_MESSAGES.failed],
    ['a network failure', { kind: 'network' }, NETWORK_MESSAGE],
    ['a client timeout', { kind: 'timeout' }, NETWORK_MESSAGE],
  ])('describes %s', (_label, failure, message) => {
    expect(describeBriefFailure(failure).message).toBe(message)
  })

  it('never shows the server message about the itinerary', () => {
    expect(describeBriefFailure(api('AI_TIMEOUT')).message).not.toContain('itinerary')
  })
})
