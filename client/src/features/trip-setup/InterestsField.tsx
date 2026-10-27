import { INTEREST_LIMITS, PREFERENCE_MESSAGES, hasInterest, interestSchema } from '@travel-planner/shared'
import { useId, useState, type KeyboardEvent } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { TextInput } from '../../components/ui/TextInput.tsx'

type InterestsFieldProps = {
  value: string[]
  onChange: (interests: string[]) => void
  /** Error for the list as a whole, from form validation (e.g. a tampered list). */
  error?: string
}

export function InterestsField({ value, onChange, error }: InterestsFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const [addError, setAddError] = useState<string>()
  const [announcement, setAnnouncement] = useState('')
  const isFull = value.length >= INTEREST_LIMITS.count
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const shownError = addError ?? error

  function add() {
    const parsed = interestSchema.safeParse(draft)
    if (!parsed.success) {
      setAddError(parsed.error.issues[0]?.message ?? PREFERENCE_MESSAGES.interestLength)
      return
    }
    if (hasInterest(value, parsed.data)) {
      setAddError(PREFERENCE_MESSAGES.interestDuplicate)
      return
    }
    if (isFull) {
      setAddError(PREFERENCE_MESSAGES.interestCount)
      return
    }
    onChange([...value, parsed.data])
    setDraft('')
    setAddError(undefined)
    setAnnouncement(`Added ${parsed.data}`)
  }

  function remove(interest: string) {
    onChange(value.filter((item) => item !== interest))
    setAnnouncement(`Removed ${interest}`)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter adds the interest instead of submitting the whole form.
    if (event.key === 'Enter') {
      event.preventDefault()
      add()
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        Interests (optional)
      </label>
      <div className="flex gap-2">
        <TextInput
          id={id}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setAddError(undefined)
          }}
          onKeyDown={onKeyDown}
          disabled={isFull}
          placeholder="e.g. street art"
          autoComplete="off"
          aria-describedby={[hintId, shownError && errorId].filter(Boolean).join(' ')}
          aria-invalid={shownError ? true : undefined}
        />
        <Button variant="secondary" onClick={add} disabled={isFull}>
          Add
        </Button>
      </div>
      <p id={hintId} className="text-sm text-muted">
        {isFull
          ? PREFERENCE_MESSAGES.interestCount
          : `Press Enter to add. Up to ${INTEREST_LIMITS.count} interests.`}
      </p>
      {shownError && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-coral-text">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 fill-current">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 3.5h1.5v5h-1.5v-5Zm0 6.5h1.5v1.5h-1.5V11Z" />
          </svg>
          {shownError}
        </p>
      )}
      {value.length > 0 && (
        <ul aria-label="Your interests" className="mt-2 flex flex-wrap gap-2">
          {value.map((interest) => (
            <li
              key={interest}
              className="inline-flex items-center gap-1 rounded-pill bg-mint py-1 pr-1 pl-3 text-sm text-ink"
            >
              {interest}
              <button
                type="button"
                onClick={() => remove(interest)}
                aria-label={`Remove ${interest}`}
                className="inline-flex size-6 items-center justify-center rounded-pill text-muted hover:bg-surface hover:text-ink"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 fill-current">
                  <path d="m4.5 3.5 3.5 3.5 3.5-3.5 1 1L9 8l3.5 3.5-1 1L8 9l-3.5 3.5-1-1L7 8 3.5 4.5l1-1Z" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
