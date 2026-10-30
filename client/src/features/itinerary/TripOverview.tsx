import { tripLengthInDays, type Trip } from '@travel-planner/shared'
import { PageHeading } from '../../components/ui/PageHeading.tsx'
import { formatDate, plural } from '../trip-setup/format.ts'
import { paceTitle, travelStyleTitle } from '../trip-setup/styleOptions.ts'

/** The trip's heading and key facts. The budget and costs are in the budget summary. */
export function TripOverview({ trip }: { trip: Trip }) {
  const { destination, origin, startDate, endDate, travelers, travelStyle, pace } = trip.preferences
  const facts: Array<[label: string, value: string]> = [
    ['Dates', `${formatDate(startDate)} – ${formatDate(endDate)} · ${plural(tripLengthInDays(startDate, endDate), 'day', 'days')}`],
    ['Travelers', plural(travelers, 'traveler', 'travelers')],
    ['Style', travelStyleTitle(travelStyle)],
    ['Pace', paceTitle(pace)],
    ...(origin ? [['Starting from', origin] as [string, string]] : []),
  ]

  return (
    <header>
      <PageHeading>{destination}</PageHeading>
      <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        {facts.map(([label, value]) => (
          // The date range is the longest value; give it room so it doesn't wrap.
          <div key={label} className={label === 'Dates' ? 'col-span-2' : undefined}>
            <dt className="text-sm font-semibold text-muted">{label}</dt>
            <dd className="mt-0.5 text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </header>
  )
}
