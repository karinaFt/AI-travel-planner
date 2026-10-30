import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { describeFailure, type GenerationFailure } from './messages.ts'

type GenerationErrorProps = {
  failure: GenerationFailure
  /** When the failure happened, in ms since the epoch: the start of any `Retry-After` wait. */
  failedAt: number
  onRetry: () => void
  onEdit: () => void
}

/** Whole seconds left until `until`, updated every second until it reaches 0. */
function useSecondsLeft(until: number | undefined) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (until === undefined) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [until])

  return until === undefined ? 0 : Math.max(0, Math.ceil((until - now) / 1000))
}

/** A failed generation: what happened, and the ways forward. Focus moves to its heading. */
export function GenerationError({ failure, failedAt, onRetry, onEdit }: GenerationErrorProps) {
  const { message, canRetry, retryAfterSeconds } = describeFailure(failure)
  const secondsLeft = useSecondsLeft(retryAfterSeconds === undefined ? undefined : failedAt + retryAfterSeconds * 1000)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div role="alert" className="flex flex-col gap-4 rounded-xl bg-coral-soft px-4 py-4">
      <div>
        <h3 ref={headingRef} tabIndex={-1} className="font-semibold text-coral-text focus:outline-none">
          We couldn&apos;t generate your itinerary
        </h3>
        <p className="mt-1 text-ink">{message}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {canRetry && (
          <Button onClick={onRetry} disabled={secondsLeft > 0}>
            {secondsLeft > 0 ? `Try again in ${secondsLeft} s` : 'Try again'}
          </Button>
        )}
        <Button variant="secondary" onClick={onEdit}>
          Edit details
        </Button>
      </div>
    </div>
  )
}
