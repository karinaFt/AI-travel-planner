import type { ApiSuccess, ValidationErrorDetails } from '@travel-planner/shared'
import type { Request, Response } from 'express'
import type { z } from 'zod'
import { AppError } from './errors.ts'
import type { InFlightGuard } from './in-flight.ts'

/** First message per field path, like the form shows them; issues about the body itself use `body`. */
export function fieldErrors(error: z.ZodError): ValidationErrorDetails {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    fields[issue.path.length > 0 ? issue.path.join('.') : 'body'] ??= issue.message
  }
  return { fields }
}

/** Parses the body with `schema`, or throws `VALIDATION_ERROR` with the field messages. */
export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.output<S> {
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new AppError('VALIDATION_ERROR', fieldErrors(parsed.error))
  return parsed.data
}

export type AiRequestOptions = {
  /** One running AI request per client IP for this endpoint. */
  inFlight: InFlightGuard
  /** How long the AI call may take before it answers `AI_TIMEOUT`. */
  timeoutMs: number
}

/**
 * Runs one AI-backed request for a validated body: takes the client's slot (`409 GENERATION_IN_PROGRESS`
 * while it's held), aborts `work` on timeout or when the client goes away, answers `{ data }`, and always
 * frees the slot. A client that went away gets no answer; the request log records it as aborted.
 */
export async function runAiRequest<T>(
  req: Request,
  res: Response,
  { inFlight, timeoutMs }: AiRequestOptions,
  work: (signal: AbortSignal) => Promise<T>,
) {
  const release = inFlight.tryAcquire(req.ip ?? req.socket.remoteAddress ?? 'unknown')
  if (!release) throw new AppError('GENERATION_IN_PROGRESS')

  // `close` before the response ends means the client went away: stop waiting for the AI.
  const clientGone = new AbortController()
  const onClose = () => {
    if (!res.writableEnded) clientGone.abort()
  }
  res.on('close', onClose)
  const signal = AbortSignal.any([clientGone.signal, AbortSignal.timeout(timeoutMs)])
  try {
    const body: ApiSuccess<T> = { data: await work(signal) }
    res.json(body)
  } catch (error) {
    if (clientGone.signal.aborted) return
    throw error
  } finally {
    res.off('close', onClose)
    release()
  }
}
