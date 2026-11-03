import { tripLengthInDays, type Trip } from '@travel-planner/shared'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router'
import { ButtonLink } from '../../components/ui/ButtonLink.tsx'
import { Card } from '../../components/ui/Card.tsx'
import { DeleteConfirmation } from '../../components/ui/DeleteConfirmation.tsx'
import { formatDate, formatMoney, plural } from '../trip-setup/format.ts'
import { useTripStore } from './tripStoreContext.ts'
import { useTripList } from './useTrips.ts'

/** Saved trips with a link to each and in-page delete; an empty state when there are none. */
export function TripList() {
  const store = useTripStore()
  const trips = useTripList()
  const [confirming, setConfirming] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  // Flush first, so the element to focus exists (or is gone) when we look for it.
  function focusAfter(update: () => void, selector: string) {
    flushSync(update)
    rootRef.current?.querySelector<HTMLElement>(selector)?.focus()
  }
  const deleteButton = (id: string) => `[data-action="delete"][data-trip-id="${id}"]`
  const tripLink = (id: string) => `[data-action="open"][data-trip-id="${id}"]`

  function remove(trip: Trip) {
    const index = trips.indexOf(trip)
    const neighbour = trips[index + 1] ?? trips[index - 1]
    const { destination } = trip.preferences
    if (store.remove(trip.id) === 'failed') {
      focusAfter(() => {
        setConfirming(null)
        setStatus(`Couldn't delete "${destination}". Try again.`)
      }, deleteButton(trip.id))
      return
    }
    focusAfter(
      () => {
        setConfirming(null)
        setStatus(`Deleted "${destination}".`)
      },
      neighbour ? tripLink(neighbour.id) : '[data-action="plan"]',
    )
  }

  return (
    <div ref={rootRef} className="mt-8">
      {trips.length === 0 ? (
        <Card className="text-center">
          <p className="text-ink">No saved trips yet. Trips you plan are saved here automatically.</p>
          <ButtonLink to="/plan" data-action="plan" className="mt-6">
            Plan a trip
          </ButtonLink>
        </Card>
      ) : (
        <ul aria-label="Saved trips" className="grid gap-4">
          {trips.map((trip) => (
            <TripItem
              key={trip.id}
              trip={trip}
              confirming={confirming === trip.id}
              onAskDelete={() => setConfirming(trip.id)}
              onDelete={() => remove(trip)}
              onKeep={() => focusAfter(() => setConfirming(null), deleteButton(trip.id))}
            />
          ))}
        </ul>
      )}
      {/* Always in the DOM, so screen readers announce changes to its text. */}
      <p role="status" className="sr-only">
        {status}
      </p>
    </div>
  )
}

type TripItemProps = {
  trip: Trip
  confirming: boolean
  onAskDelete: () => void
  onDelete: () => void
  onKeep: () => void
}

function TripItem({ trip, confirming, onAskDelete, onDelete, onKeep }: TripItemProps) {
  const { destination, startDate, endDate, travelers, budget, currency } = trip.preferences
  const dates = `${formatDate(startDate)} – ${formatDate(endDate)}`

  return (
    <Card as="li" className="sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <h2 className="text-xl">
            <Link
              to={`/trips/${trip.id}`}
              data-action="open"
              data-trip-id={trip.id}
              className="text-ink underline-offset-4 hover:underline"
            >
              {destination}
            </Link>
          </h2>
          <p className="mt-1 text-ink">
            {dates} · {plural(tripLengthInDays(startDate, endDate), 'day', 'days')}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {plural(travelers, 'traveler', 'travelers')} · Budget {formatMoney(budget, currency)}
          </p>
        </div>
        <button
          type="button"
          // Destination and dates tell apart two trips to the same place.
          aria-label={`Delete ${destination} trip, ${dates}`}
          data-action="delete"
          data-trip-id={trip.id}
          onClick={onAskDelete}
          className="text-sm font-semibold text-coral-text underline-offset-4 hover:underline"
        >
          Delete
        </button>
      </div>
      {confirming && <DeleteConfirmation title={destination} onDelete={onDelete} onKeep={onKeep} />}
    </Card>
  )
}
