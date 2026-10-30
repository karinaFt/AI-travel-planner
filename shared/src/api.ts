import { z } from 'zod'

/** Every error code the API can return, with its HTTP status and a message safe to show users. */
export const ERROR_CODES = {
  VALIDATION_ERROR: { status: 400, message: 'Some of the trip details are not valid.' },
  INVALID_JSON: { status: 400, message: 'The request body is not valid JSON.' },
  NOT_FOUND: { status: 404, message: 'This API route does not exist.' },
  GENERATION_IN_PROGRESS: {
    status: 409,
    message: 'An itinerary is already being generated. Please wait for it to finish.',
  },
  PAYLOAD_TOO_LARGE: { status: 413, message: 'The request body is too large.' },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, message: 'Send the request body as JSON.' },
  RATE_LIMITED: { status: 429, message: 'Too many requests. Please try again a little later.' },
  INTERNAL_ERROR: { status: 500, message: 'Something went wrong on our side. Please try again.' },
  AI_INVALID_RESPONSE: { status: 502, message: 'The itinerary could not be generated. Please try again.' },
  AI_PROVIDER_ERROR: {
    status: 502,
    message: 'The itinerary service is temporarily unavailable. Please try again.',
  },
  AI_UNAVAILABLE: { status: 503, message: 'The itinerary service is busy right now. Please try again later.' },
  AI_TIMEOUT: { status: 504, message: 'Generating the itinerary took too long. Please try again.' },
} as const

export type ApiErrorCode = keyof typeof ERROR_CODES

const errorCodeNames = Object.keys(ERROR_CODES) as [ApiErrorCode, ...ApiErrorCode[]]

/** `details` of a `VALIDATION_ERROR`: the first message per invalid field path (`body` for the body itself). */
export type ValidationErrorDetails = { fields: Record<string, string> }

/** Successful response body. */
export type ApiSuccess<T> = { data: T }

/** Error response body from any /api route. */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.enum(errorCodeNames),
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().optional(),
  }),
})

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
