/** Limits on itinerary generation. They protect the shared free-tier quota from one noisy client. */
export type GenerationLimits = {
  /** Generate requests per client IP per minute, valid or not. */
  perMinute: number
  /** Generate requests per client IP per hour. */
  perHour: number
  /** How long one AI call may take before it is aborted with `AI_TIMEOUT`. */
  timeoutMs: number
}

export const GENERATION_LIMITS: GenerationLimits = { perMinute: 5, perHour: 30, timeoutMs: 30_000 }

/** Per-IP limits on day briefs, counted apart from generation. A 14-day trip may need 14 briefs. */
export type BriefLimits = Pick<GenerationLimits, 'perMinute' | 'perHour'>

export const BRIEF_LIMITS: BriefLimits = { perMinute: 10, perHour: 60 }
