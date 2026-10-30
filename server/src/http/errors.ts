import { ERROR_CODES, type ApiErrorBody, type ApiErrorCode } from '@travel-planner/shared'
import type { ErrorRequestHandler, RequestHandler, Response } from 'express'
import type { Logger } from './logger.ts'

/** An expected failure with a known error code. Handlers throw it; the error handler turns it into the envelope. */
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

/** Stack frames only: the first line of `stack` repeats the message, which may carry user or provider data. */
function stackFrames(error: Error) {
  return (error.stack ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at '))
}

/**
 * Sends every error as the JSON envelope. Unexpected errors are logged server-side as one line with the
 * request ID, error name and stack frames, never the message.
 */
export function createErrorHandler(log: Logger): ErrorRequestHandler {
  return (error, _req, res, next) => {
    if (res.headersSent) {
      next(error)
      return
    }
    const appError = toAppError(error)
    if (!appError) {
      log({
        event: 'error',
        requestId: res.locals.requestId,
        ...(error instanceof Error ? { name: error.name, stack: stackFrames(error) } : { name: 'NonError' }),
      })
    }
    sendError(res, appError)
  }
}

function sendError(res: Response, appError: AppError | undefined) {
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
