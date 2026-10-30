import { tripLengthInDays, type Trip } from '@travel-planner/shared'
import { useParams } from 'react-router'
import { ButtonLink } from '../components/ui/ButtonLink.tsx'
import { Card } from '../components/ui/Card.tsx'
import { Container } from '../components/ui/Container.tsx'
import { PageHeading } from '../components/ui/PageHeading.tsx'
import { formatDate, plural } from '../features/trip-setup/format.ts'
import { useTripStore } from '../features/trips/tripStoreContext.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function TripPage() {
  const { id = '' } = useParams()
  const trip = useTripStore().get(id)
  return trip ? <TripSummary trip={trip} /> : <TripNotFound />
}

/** A short summary of a generated trip; the full day-by-day view comes later. */
function TripSummary({ trip }: { trip: Trip }) {
  const { destination, startDate, endDate } = trip.preferences
  useDocumentTitle(`${destination} trip`)

  return (
    <Container className="py-12 sm:py-16">
      <PageHeading>{destination}</PageHeading>
      <p className="mt-3 text-muted">
        {formatDate(startDate)} – {formatDate(endDate)} · {plural(tripLengthInDays(startDate, endDate), 'day', 'days')}
      </p>
      <Card className="mt-8 max-w-3xl">
        <h2 className="text-2xl">Your itinerary</h2>
        <ol className="mt-4 flex flex-col gap-3">
          {trip.itinerary.days.map((day) => (
            <li key={day.id} className="flex gap-3">
              <span className="shrink-0 font-semibold text-primary">Day {day.dayNumber}</span>
              <span className="text-ink">{day.title}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 rounded-xl bg-sky px-4 py-3 text-sm text-ink">
          The full day-by-day view is coming soon.
        </p>
      </Card>
      <ButtonLink to="/plan" variant="secondary" className="mt-8">
        Plan another trip
      </ButtonLink>
    </Container>
  )
}

function TripNotFound() {
  useDocumentTitle('Trip not found')

  return (
    <Container className="py-16 text-center sm:py-24">
      <PageHeading>Trip not found</PageHeading>
      <p className="mx-auto mt-4 max-w-xl text-muted">
        Generated trips are kept only until the page is reloaded, so this one may no longer be here.
      </p>
      <ButtonLink to="/plan" variant="secondary" className="mt-8">
        Plan a trip
      </ButtonLink>
    </Container>
  )
}
