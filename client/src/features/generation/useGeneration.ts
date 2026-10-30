import type { Trip, TripPreferences } from '@travel-planner/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { generateItinerary } from '../../api/itineraries.ts'
import type { GenerationFailure } from './messages.ts'

export type GenerationState =
  | { name: 'idle'; notice?: 'cancelled' }
  | { name: 'loading' }
  /** `failedAt` tells one failure from the next, even when both have the same cause. */
  | { name: 'error'; failure: GenerationFailure; failedAt: number }

/**
 * Runs one generation at a time. `cancel()` and unmounting abort the running request, and a result that
 * arrives after that is ignored. Success is handed to `onSuccess`; the state stays `loading` meanwhile.
 */
export function useGeneration({ onSuccess }: { onSuccess: (trip: Trip) => void }) {
  const [state, setState] = useState<GenerationState>({ name: 'idle' })
  const running = useRef<AbortController | null>(null)
  const onSuccessRef = useRef(onSuccess)

  useEffect(() => {
    onSuccessRef.current = onSuccess
  })

  useEffect(
    () => () => {
      running.current?.abort()
      running.current = null
    },
    [],
  )

  const generate = useCallback(async (preferences: TripPreferences) => {
    if (running.current) return
    const controller = new AbortController()
    running.current = controller
    setState({ name: 'loading' })

    const result = await generateItinerary(preferences, { signal: controller.signal })
    // Cancelled or unmounted meanwhile: nobody is waiting for this result.
    if (running.current !== controller) return
    running.current = null

    if (result.ok) onSuccessRef.current(result.data)
    else if (result.error.kind === 'cancelled') setState({ name: 'idle', notice: 'cancelled' })
    else setState({ name: 'error', failure: result.error, failedAt: Date.now() })
  }, [])

  const cancel = useCallback(() => {
    if (!running.current) return
    running.current.abort()
    running.current = null
    setState({ name: 'idle', notice: 'cancelled' })
  }, [])

  /** Back to a plain idle state, e.g. before leaving the review to edit. */
  const reset = useCallback(() => {
    if (!running.current) setState({ name: 'idle' })
  }, [])

  return { state, generate, cancel, reset }
}
