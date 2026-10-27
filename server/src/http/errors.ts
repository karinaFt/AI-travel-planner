import { ERROR_CODES, type ApiErrorBody, type ApiErrorCode } from '@travel-planner/shared'
import type { ErrorRequestHandler, RequestHandler } from 'express'

/** An expected failure with a known error code. Handlers throw it; `errorHandler` turns it into the envelope. */
export class AppError extends Error {
  override name = 'AppError'
  readonly code: ApiErrorCode
  readonly details: unknown

  constructor(code: ApiErrorCode, details?: unknown) {
    super(ERROR_CODES[code].message)
    this.code = code
    this.details = details
  }
}

/** Fallback for /api paths no route matched. */
export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND'))
}

/** Maps body-parser failures to their codes; anything unrecognized is an internal error. */
function toAppError(error: unknown): AppError | undefined {
  if (error instanceof AppError) return error
  const type = (error as { type?: unknown } | null)?.type
  if (type === 'entity.parse.failed') return new AppError('INVALID_JSON')
  if (type === 'entity.too.large') return new AppError('PAYLOAD_TOO_LARGE')
  return undefined
}

/** Sends every error as the JSON envelope. Unexpected errors are logged server-side only. */
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }
  const appError = toAppError(error)
  if (!appError) console.error(error)
  const code = appError?.code ?? 'INTERNAL_ERROR'
  const { status, message } = ERROR_CODES[code]
  res.locals.errorCode = code
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      requestId: res.locals.requestId,
      ...(appError?.details !== undefined && { details: appError.details }),
    },
  }
  res.status(status).json(body)
}
