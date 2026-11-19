import type { ApiFailure } from '../../api/http.ts'
import { NETWORK_MESSAGE, waitText } from '../generation/messages.ts'

/** A failed overview request: cancelling is not a failure, so it has no message. */
export type BriefFailure = Exclude<ApiFailure, { kind: 'cancelled' }>

export type BriefFailureView = {
  message: string
  /** Set when the API said how long to wait before trying again. */
  retryAfterSeconds?: number
}

export const BRIEF_MESSAGES = {
  failed: "The day overview couldn't be created. Please try again.",
  busy: 'Day overviews are busy or unavailable right now. Please try again later.',
  inProgress: 'Another day overview is being created. Please wait for it to finish, then try again.',
} as const

/** What to tell the user about a failed overview. The server's own messages talk about the itinerary. */
export function describeBriefFailure(failure: BriefFailure): BriefFailureView {
  switch (failure.kind) {
    case 'network':
    case 'timeout':
      return { message: NETWORK_MESSAGE }
    case 'invalid-response':
      return { message: BRIEF_MESSAGES.failed }
    case 'api':
      switch (failure.code) {
        case 'RATE_LIMITED':
          return failure.retryAfterSeconds === undefined
            ? { message: 'Too many requests. Please try again a little later.' }
            : {
                message: `Too many requests. You can try again in ${waitText(failure.retryAfterSeconds)}.`,
                retryAfterSeconds: failure.retryAfterSeconds,
              }
        case 'GENERATION_IN_PROGRESS':
          return { message: BRIEF_MESSAGES.inProgress }
        case 'AI_UNAVAILABLE':
          return { message: BRIEF_MESSAGES.busy }
        default:
          return { message: BRIEF_MESSAGES.failed }
      }
  }
}
