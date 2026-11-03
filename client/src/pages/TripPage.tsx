import { useState } from 'react'
import { useParams } from 'react-router'
import { ButtonLink } from '../components/ui/ButtonLink.tsx'
import { Container } from '../components/ui/Container.tsx'
import { PageHeading } from '../components/ui/PageHeading.tsx'
import { ItineraryView } from '../features/itinerary/ItineraryView.tsx'
import { useStoredTrip } from '../features/trips/useTrips.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function TripPage() {
  const { id = '' } = useParams()
  const { trip, revision } = useStoredTrip(id)
  // Remembers that this visit showed the trip, so losing it means another tab deleted it.
  const [shownId, setShownId] = useState<string | null>(null)
  if (trip && shownId !== id) setShownId(id)

  if (!trip) return shownId === id ? <TripDeleted /> : <TripNotFound />
  // Keyed by ID, so opening another trip starts its edits from that trip, and by revision, so a change
  // from another tab replaces the view and closes any open form.
  return <ItineraryView key={`${trip.id}:${revision}`} trip={trip} updatedElsewhere={revision > 0} />
}

function TripNotFound() {
  useDocumentTitle('Trip not found')
  return (
    <TripMissing heading="Trip not found">
      Trips are saved only in the browser they were planned in, and this one may have been deleted.
    </TripMissing>
  )
}

function TripDeleted() {
  useDocumentTitle('Trip deleted')
  return <TripMissing heading="Trip deleted">This trip was deleted in another tab.</TripMissing>
}

function TripMissing({ heading, children }: { heading: string; children: string }) {
  return (
    <Container className="py-16 text-center sm:py-24">
      <PageHeading>{heading}</PageHeading>
      <p className="mx-auto mt-4 max-w-xl text-muted">{children}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/trips" variant="secondary">
          My trips
        </ButtonLink>
        <ButtonLink to="/plan" variant="secondary">
          Plan a trip
        </ButtonLink>
      </div>
    </Container>
  )
}
