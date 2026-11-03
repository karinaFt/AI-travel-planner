import { useEffect, useId, useRef } from 'react'
import { Button } from './Button.tsx'

type DeleteConfirmationProps = {
  title: string
  onDelete: () => void
  onKeep: () => void
}

/** Asks in the page, not in a browser dialog, before something is deleted. Focuses "Keep"; Escape keeps. */
export function DeleteConfirmation({ title, onDelete, onKeep }: DeleteConfirmationProps) {
  const questionId = useId()
  const keepRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    keepRef.current?.focus()
  }, [])

  return (
    <div
      role="group"
      aria-labelledby={questionId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onKeep()
      }}
      className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-coral-soft px-4 py-3"
    >
      <p id={questionId} className="text-sm font-semibold text-ink">
        {`Delete "${title}"?`}
      </p>
      <Button variant="danger" onClick={onDelete}>
        Delete
      </Button>
      <Button ref={keepRef} variant="secondary" onClick={onKeep}>
        Keep
      </Button>
    </div>
  )
}
