import { useEffect, useRef } from 'react'
import { Button } from '../../components/ui/Button.tsx'

/** Shown while the itinerary is generated. Focus moves to Cancel so keyboard users can stop at once. */
export function GenerationStatus({ onCancel }: { onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
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
