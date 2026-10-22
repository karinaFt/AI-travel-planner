import { tripLengthInDays, type TripBasics } from '@travel-planner/shared'
import { format, parseISO } from 'date-fns'
import type { Ref } from 'react'
import { Button } from '../../components/ui/Button.tsx'

type TripBasicsSummaryProps = {
  basics: TripBasics
  onEdit: () => void
  headingRef?: Ref<HTMLHeadingElement>
}

function formatDate(isoDate: string) {
  return format(parseISO(isoDate), 'd MMM yyyy')
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount)
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

export function TripBasicsSummary({ basics, onEdit, headingRef }: TripBasicsSummaryProps) {
  const days = tripLengthInDays(basics.startDate, basics.endDate)
  const rows: Array<[string, string]> = [
    ['Destination', basics.destination],
    ['Dates', `${formatDate(basics.startDate)} – ${formatDate(basics.endDate)}`],
    ['Length', plural(days, 'day', 'days')],
    ['Budget', formatMoney(basics.budget, basics.currency)],
    ['Travelers', plural(basics.travelers, 'traveler', 'travelers')],
  ]

  return (
    <section aria-labelledby="trip-summary-heading" className="flex flex-col gap-6">
      <h2
        id="trip-summary-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl focus:outline-none"
      >
        Your trip so far
      </h2>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-[auto_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-sm font-semibold text-muted">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">
        Next you will choose your travel style, pace and interests.
      </p>
      <div>
        <Button variant="secondary" onClick={onEdit}>
          Edit details
        </Button>
      </div>
    </section>
  )
}
