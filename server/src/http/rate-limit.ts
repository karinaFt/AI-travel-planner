import type { RequestHandler } from 'express'
import { HOUR, MINUTE, rateLimit, type AugmentedRequest, type Options } from 'express-rate-limit'
import type { GenerationLimits } from '../protection.ts'
import { AppError } from './errors.ts'

const shared: Partial<Options> = {
  // `RateLimit` and `RateLimit-Policy` headers; both limiters append their own entry.
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // With TRUST_PROXY=0 an X-Forwarded-For header is ignored on purpose, not a misconfiguration to warn about.
  validate: { xForwardedForHeader: false },
  handler: (req, res, next) => {
    const { resetTime } = (req as AugmentedRequest).rateLimit
    const seconds = resetTime ? Math.ceil((resetTime.getTime() - Date.now()) / 1000) : 1
    res.setHeader('Retry-After', String(Math.max(1, seconds)))
    next(new AppError('RATE_LIMITED'))
  },
}

/**
 * Per-IP limits for the generate endpoint, kept in this process's memory. Mount it before body parsing so
 * malformed requests count too. The minute limit runs first, so a blocked burst doesn't use up the hour.
 */
export function generationRateLimit({ perMinute, perHour }: Pick<GenerationLimits, 'perMinute' | 'perHour'>) {
  return [
    rateLimit({ ...shared, windowMs: MINUTE, limit: perMinute }),
    rateLimit({ ...shared, windowMs: HOUR, limit: perHour }),
  ] satisfies RequestHandler[]
}
