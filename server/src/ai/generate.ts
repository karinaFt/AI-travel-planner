import { randomUUID } from 'node:crypto'
import { tripLengthInDays, type Trip, type TripPreferences } from '@travel-planner/shared'
import { AppError } from '../http/errors.ts'
import type { GenerateRequest, ItineraryModel } from './model.ts'
import { normalizeTrip, type NormalizeDeps } from './normalize.ts'
import { buildPrompt } from './prompt.ts'
import { responseJsonSchema } from './response-schema.ts'

const defaultDeps: NormalizeDeps = { newId: randomUUID, now: () => new Date() }

export type GenerateOptions = {
  /** Fires on timeout or client disconnect; the call then rejects with `AI_TIMEOUT`. */
  signal?: AbortSignal
  deps?: NormalizeDeps
}

/**
 * Settles like `promise`, or rejects with `AI_TIMEOUT` as soon as `signal` fires, so a model that ignores
 * the signal can't keep the caller waiting. The losing promise is left to settle on its own.
 */
function abortable<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(new AppError('AI_TIMEOUT'))
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new AppError('AI_TIMEOUT'))
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

/** Calls the model once and gives up with `AI_TIMEOUT` as soon as `signal` fires. */
export async function callModel(model: ItineraryModel, request: GenerateRequest, signal?: AbortSignal) {
  try {
    return await abortable(model.generate(request, signal), signal)
  } catch (error) {
    // Whatever the model rejected with once the signal fired, the cause is the abort.
    if (signal?.aborted) throw new AppError('AI_TIMEOUT')
    throw error
  }
}

/** One AI call, no retry: prompt → model → validated, normalized trip. */
export async function generateTrip(
  preferences: TripPreferences,
  model: ItineraryModel,
  { signal, deps = defaultDeps }: GenerateOptions = {},
): Promise<Trip> {
  const { systemInstruction, contents } = buildPrompt(preferences)
  const days = tripLengthInDays(preferences.startDate, preferences.endDate)
  const text = await callModel(model, { systemInstruction, contents, responseJsonSchema: responseJsonSchema(days) }, signal)
  return normalizeTrip(text, preferences, deps)
}
