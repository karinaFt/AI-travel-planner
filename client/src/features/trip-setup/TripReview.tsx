import { tripLengthInDays, type TripPreferences } from '@travel-planner/shared'
import { useEffect, useRef, type Ref } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { GenerationError } from '../generation/GenerationError.tsx'
import { GenerationStatus } from '../generation/GenerationStatus.tsx'
import type { GenerationState } from '../generation/useGeneration.ts'
import { formatDate, formatMoney, plural } from './format.ts'
import { paceTitle, travelStyleTitle } from './styleOptions.ts'

type TripReviewProps = {
  preferences: TripPreferences
  onEdit: () => void
  headingRef?: Ref<HTMLHeadingElement>
  generation: GenerationState
  /** Starts generation; also used by "Try again". */
  onGenerate: () => void
  onCancel: () => void
}

export function TripReview({ preferences, onEdit, headingRef, generation, onGenerate, onCancel }: TripReviewProps) {
  const days = tripLengthInDays(preferences.startDate, preferences.endDate)
  const rows: Array<[string, string]> = [
    ['Destination', preferences.destination],
    ['Starting from', preferences.origin ?? 'Not specified'],
    ['Dates', `${formatDate(preferences.startDate)} – ${formatDate(preferences.endDate)}`],
    ['Length', plural(days, 'day', 'days')],
    ['Budget', formatMoney(preferences.budget, preferences.currency)],
    ['Travelers', plural(preferences.travelers, 'traveler', 'travelers')],
    ['Style', travelStyleTitle(preferences.travelStyle)],
    ['Pace', paceTitle(preferences.pace)],
    ['Interests', preferences.interests.length > 0 ? preferences.interests.join(', ') : 'None'],
  ]

  return (
    <section aria-labelledby="trip-review-heading" className="flex flex-col gap-6">
      <h2 id="trip-review-heading" ref={headingRef} tabIndex={-1} className="text-2xl focus:outline-none">
        Review your trip
      </h2>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-[auto_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-sm font-semibold text-muted">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <GenerationFooter state={generation} onGenerate={onGenerate} onCancel={onCancel} onEdit={onEdit} />
    </section>
  )
}

type GenerationFooterProps = {
  state: GenerationState
  onGenerate: () => void
  onCancel: () => void
  onEdit: () => void
}

/** The review's actions: generate, then a loading status or an error in their place. */
function GenerationFooter({ state, onGenerate, onCancel, onEdit }: GenerationFooterProps) {
  const generateRef = useRef<HTMLButtonElement>(null)
  const cancelled = state.name === 'idle' && state.notice === 'cancelled'

  // The Cancel button is gone after cancelling; keep keyboard focus nearby.
  useEffect(() => {
    if (cancelled) generateRef.current?.focus()
  }, [cancelled])

  if (state.name === 'loading') return <GenerationStatus onCancel={onCancel} />
  if (state.name === 'error') {
    return (
      <GenerationError
        key={state.failedAt}
        failure={state.failure}
        failedAt={state.failedAt}
        onRetry={onGenerate}
        onEdit={onEdit}
      />
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="text-sm text-muted empty:hidden">
        {cancelled ? 'Generation cancelled.' : ''}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button ref={generateRef} onClick={onGenerate}>
          Generate itinerary
        </Button>
        <Button variant="secondary" onClick={onEdit}>
          Edit details
        </Button>
      </div>
    </div>
  )
}
