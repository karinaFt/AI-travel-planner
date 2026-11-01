import { useParams } from 'react-router'
import { ButtonLink } from '../components/ui/ButtonLink.tsx'
import { Container } from '../components/ui/Container.tsx'
import { PageHeading } from '../components/ui/PageHeading.tsx'
import { ItineraryView } from '../features/itinerary/ItineraryView.tsx'
import { useTripStore } from '../features/trips/tripStoreContext.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function TripPage() {
  const { id = '' } = useParams()
  const trip = useTripStore().get(id)
  // Keyed by ID, so opening another trip starts its edits from that trip.
  return trip ? <ItineraryView key={trip.id} trip={trip} /> : <TripNotFound />
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
