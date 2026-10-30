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
