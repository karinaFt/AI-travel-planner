import type { DayBriefRequest, DayBriefResult } from '@travel-planner/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createDayBrief } from '../../api/dayBriefs.ts'
import type { BriefFailure } from './messages.ts'

export type BriefState =
  | { name: 'idle' }
  | { name: 'loading' }
  /** `failedAt` tells one failure from the next, even when both have the same cause. */
  | { name: 'error'; failure: BriefFailure; failedAt: number }

/**
 * Runs one overview request at a time. Unmounting (switching days, leaving the page) aborts it, and a
 * result that arrives after that is ignored. Success goes to `onSuccess` and the state returns to idle.
 */
export function useDayBrief({ onSuccess }: { onSuccess: (result: DayBriefResult) => void }) {
  const [state, setState] = useState<BriefState>({ name: 'idle' })
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

  const create = useCallback(async (request: DayBriefRequest) => {
    if (running.current) return
    const controller = new AbortController()
    running.current = controller
    setState({ name: 'loading' })

    const result = await createDayBrief(request, { signal: controller.signal })
    // Unmounted meanwhile: nobody is waiting for this result.
    if (running.current !== controller) return
    running.current = null

    if (result.ok) {
      onSuccessRef.current(result.data)
      setState({ name: 'idle' })
    } else if (result.error.kind === 'cancelled') {
      setState({ name: 'idle' })
    } else {
      setState({ name: 'error', failure: result.error, failedAt: Date.now() })
    }
  }, [])

  return { state, create }
}
