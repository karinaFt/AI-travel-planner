import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'

/** After this long, a free-tier server may still be waking up from sleep. */
export const SLOW_NOTICE_MS = 15_000

/** Shown while the itinerary is generated. Focus moves to Cancel so keyboard users can stop at once. */
export function GenerationStatus({ onCancel }: { onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    cancelRef.current?.focus()
    const timer = setTimeout(() => setSlow(true), SLOW_NOTICE_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-sky px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div role="status" className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none"
        />
        <p className="text-ink">
          <span className="font-semibold">Generating your itinerary…</span>
          <span className="block text-sm text-muted">This usually takes up to half a minute.</span>
          {slow && (
            <span className="block text-sm text-muted">
              The server may be waking up after a pause. This can take up to a minute.
            </span>
          )}
        </p>
      </div>
      <div>
        <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
