import { tripLengthInDays, type TripPreferences } from '@travel-planner/shared'
import type { Ref } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { formatDate, formatMoney, plural } from './format.ts'
import { paceTitle, travelStyleTitle } from './styleOptions.ts'

type TripReviewProps = {
  preferences: TripPreferences
  onEdit: () => void
  headingRef?: Ref<HTMLHeadingElement>
}

export function TripReview({ preferences, onEdit, headingRef }: TripReviewProps) {
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
      <p className="rounded-xl bg-sky px-4 py-3 text-sm text-ink">
        Next: we&apos;ll generate a day-by-day itinerary for you. This is coming soon.
      </p>
      <div>
        <Button variant="secondary" onClick={onEdit}>
          Edit details
        </Button>
      </div>
    </section>
  )
}
