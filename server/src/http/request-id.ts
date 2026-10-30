import { randomUUID } from 'node:crypto'
import type { ApiErrorCode } from '@travel-planner/shared'
import type { RequestHandler } from 'express'

declare global {
  namespace Express {
    interface Locals {
      requestId: string
      /** Set by the error handler so the request log can include it. */
      errorCode?: ApiErrorCode
    }
  }
}

/** Gives every request a fresh server-side ID. An `X-Request-Id` sent by the client is ignored. */
export const requestId: RequestHandler = (_req, res, next) => {
  const id = randomUUID()
  res.locals.requestId = id
  res.setHeader('X-Request-Id', id)
  next()
}
