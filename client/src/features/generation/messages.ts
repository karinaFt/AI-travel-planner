import { ERROR_CODES } from '@travel-planner/shared'
import type { ApiFailure } from '../../api/http.ts'

/** A failed generation: cancelling is not a failure, so it has no message. */
export type GenerationFailure = Exclude<ApiFailure, { kind: 'cancelled' }>

export type FailureView = {
  message: string
  /** False when sending the same preferences again can't help. */
  canRetry: boolean
  /** Set when the API said how long to wait before trying again. */
  retryAfterSeconds?: number
}

export const NETWORK_MESSAGE = "We couldn't reach the server. Check your connection and try again."
export const VALIDATION_MESSAGE = 'Some of the trip details are not valid. Please edit them and try again.'

/** "1 second", "40 seconds"; from 2 minutes up, whole minutes rounded up: "3 minutes". */
export function waitText(seconds: number) {
  if (seconds >= 120) return `${Math.ceil(seconds / 60)} minutes`
  return seconds === 1 ? '1 second' : `${seconds} seconds`
}

/** What to tell the user about a failed generation, and whether "Try again" makes sense. */
export function describeFailure(failure: GenerationFailure): FailureView {
  switch (failure.kind) {
    case 'network':
      return { message: NETWORK_MESSAGE, canRetry: true }
    case 'timeout':
      return { message: ERROR_CODES.AI_TIMEOUT.message, canRetry: true }
    case 'invalid-response':
      return { message: ERROR_CODES.AI_INVALID_RESPONSE.message, canRetry: true }
    case 'api':
      if (failure.code === 'VALIDATION_ERROR') return { message: VALIDATION_MESSAGE, canRetry: false }
      if (failure.code === 'RATE_LIMITED' && failure.retryAfterSeconds !== undefined) {
        return {
          message: `Too many requests. You can try again in ${waitText(failure.retryAfterSeconds)}.`,
          canRetry: true,
          retryAfterSeconds: failure.retryAfterSeconds,
        }
      }
      return { message: failure.message, canRetry: true }
  }
}
