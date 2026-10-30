import { ERROR_CODES } from '@travel-planner/shared'
import { describe, expect, it } from 'vitest'
import { NETWORK_MESSAGE, VALIDATION_MESSAGE, describeFailure, waitText } from './messages.ts'

describe('describeFailure', () => {
  it('uses the API message for API errors', () => {
    expect(
      describeFailure({ kind: 'api', code: 'AI_UNAVAILABLE', message: ERROR_CODES.AI_UNAVAILABLE.message }),
    ).toEqual({ message: ERROR_CODES.AI_UNAVAILABLE.message, canRetry: true })
  })

  it('says how long to wait when rate limited', () => {
    expect(
      describeFailure({
        kind: 'api',
        code: 'RATE_LIMITED',
        message: ERROR_CODES.RATE_LIMITED.message,
        retryAfterSeconds: 40,
      }),
    ).toEqual({ message: 'Too many requests. You can try again in 40 seconds.', canRetry: true, retryAfterSeconds: 40 })
  })

  it('falls back to the API message when rate limited without Retry-After', () => {
    expect(
      describeFailure({ kind: 'api', code: 'RATE_LIMITED', message: ERROR_CODES.RATE_LIMITED.message }),
    ).toEqual({ message: ERROR_CODES.RATE_LIMITED.message, canRetry: true })
  })

  it('offers no retry for rejected preferences', () => {
    expect(
      describeFailure({ kind: 'api', code: 'VALIDATION_ERROR', message: ERROR_CODES.VALIDATION_ERROR.message }),
    ).toEqual({ message: VALIDATION_MESSAGE, canRetry: false })
  })

  it.each([
    ['network', NETWORK_MESSAGE],
    ['timeout', ERROR_CODES.AI_TIMEOUT.message],
    ['invalid-response', ERROR_CODES.AI_INVALID_RESPONSE.message],
  ] as const)('describes a %s failure', (kind, message) => {
    expect(describeFailure({ kind })).toEqual({ message, canRetry: true })
  })
})

describe('waitText', () => {
  it.each([
    [1, '1 second'],
    [40, '40 seconds'],
    [119, '119 seconds'],
    [120, '2 minutes'],
    [121, '3 minutes'],
    [3600, '60 minutes'],
  ])('%i → %s', (seconds, text) => {
    expect(waitText(seconds)).toBe(text)
  })
})
