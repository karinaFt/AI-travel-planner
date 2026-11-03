import { Container } from '../components/ui/Container.tsx'
import { PageHeading } from '../components/ui/PageHeading.tsx'
import { TripList } from '../features/trips/TripList.tsx'
import { useTripStore } from '../features/trips/tripStoreContext.ts'
import { plural } from '../features/trip-setup/format.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function TripsPage() {
  useDocumentTitle('My trips')
  const { available, skipped } = useTripStore()

  return (
    <Container className="py-12 sm:py-16">
      <PageHeading>My trips</PageHeading>
      <p className="mt-3 max-w-2xl text-muted">Trips you plan are saved in this browser automatically.</p>
      {!available && (
        <Notice>
          This browser isn't letting the app save trips, so trips last only until the tab is closed.
        </Notice>
      )}
      {skipped !== 0 && (
        <Notice>
          {skipped === 'all'
            ? "Your saved trips couldn't be read and were set aside."
            : `${plural(skipped, 'saved trip', 'saved trips')} couldn't be read and ${skipped === 1 ? 'was' : 'were'} set aside.`}
        </Notice>
      )}
      <TripList />
    </Container>
  )
}

function Notice({ children }: { children: string }) {
  return <p className="mt-6 max-w-2xl rounded-xl bg-coral-soft px-4 py-3 text-sm text-ink">{children}</p>
}
