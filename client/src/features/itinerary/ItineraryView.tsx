import { sumMoney, type Trip } from '@travel-planner/shared'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { ButtonLink } from '../../components/ui/ButtonLink.tsx'
import { Card } from '../../components/ui/Card.tsx'
import { Container } from '../../components/ui/Container.tsx'
import { BudgetSummary } from '../budget/BudgetSummary.tsx'
import { editTrip, type EditAction } from '../editing/editTrip.ts'
import { useTripStore, type UnsavedReason } from '../trips/tripStoreContext.ts'
import { TRIP_LIMIT } from '../trips/createTripStore.ts'
import { useUnsavedReason } from '../trips/useTrips.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { DayTabs } from './DayTabs.tsx'
import { DayTimeline } from './DayTimeline.tsx'
import { TripOverview } from './TripOverview.tsx'
import { useSelectedDay } from './useSelectedDay.ts'

/** Applies an edit and announces `message`; false when the edit was rejected and nothing changed. */
export type ApplyEdit = (action: EditAction, message: string) => boolean

type ItineraryViewProps = {
  trip: Trip
  /** The view replaces an older one because another tab changed the trip; announced once. */
  updatedElsewhere?: boolean
}

/** The day-by-day view of a saved trip, which the user can edit. */
export function ItineraryView({ trip: initialTrip, updatedElsewhere = false }: ItineraryViewProps) {
  const store = useTripStore()
  const [trip, setTrip] = useState(initialTrip)
  const unsavedReason = useUnsavedReason(trip.id)
  const { days } = trip.itinerary
  const { destination, budget, currency } = trip.preferences
  const [selected, selectDay] = useSelectedDay(days.length)
  // Kept with the day it was made on, so choosing another day clears it.
  const [status, setStatus] = useState<{ message: string; day: number } | null>(() =>
    updatedElsewhere ? { message: 'This trip was updated in another tab.', day: selected } : null,
  )
  useDocumentTitle(`${destination} trip`)

  // Every edit is saved right away; the store keeps the trip for the tab even when saving fails. The trip the
  // view starts from is already the store's, so mounting writes nothing (and other tabs see no change).
  useEffect(() => {
    if (store.get(trip.id) !== trip) store.save(trip)
  }, [store, trip])

  const applyEdit = useCallback<ApplyEdit>(
    (action, message) => {
      const next = editTrip(trip, action)
      if (next === trip) return false
      setTrip(next)
      setStatus({ message, day: selected })
      return true
    },
    [trip, selected],
  )

  const dayCosts = days.map((day) => sumMoney(day.activities.map((activity) => activity.estimatedCost)))
  const estimatedCost = sumMoney(dayCosts)
  const day = days[selected - 1]

  return (
    <Container className="py-12 sm:py-16">
      <TripOverview trip={trip} />
      {unsavedReason && <UnsavedNotice reason={unsavedReason} onRetry={() => store.save(trip)} />}
      <BudgetSummary
        budget={budget}
        currency={currency}
        days={days}
        dayCosts={dayCosts}
        estimatedCost={estimatedCost}
      />
      <Card as="section" aria-label="Itinerary" className="mt-10">
        <DayTabs days={days} selected={selected} onSelect={selectDay} />
        {/* A new key per day collapses every activity and closes any open form when the day changes. */}
        <DayTimeline
          key={day.id}
          day={day}
          days={days}
          estimatedCost={dayCosts[selected - 1]}
          currency={currency}
          onEdit={applyEdit}
        />
      </Card>
      {/* Always in the DOM, so screen readers announce changes to its text. */}
      <p role="status" className="sr-only">
        {status?.day === selected ? status.message : ''}
      </p>
      <ButtonLink to="/plan" variant="secondary" className="mt-8">
        Plan another trip
      </ButtonLink>
    </Container>
  )
}

const UNSAVED_MESSAGES: Record<UnsavedReason, string> = {
  limit: `This trip isn't saved: you already have ${TRIP_LIMIT} saved trips.`,
  failed: "This trip isn't saved: browser storage is full or unavailable.",
}

/** Says the trip lives only in this tab, why, and how to fix it. */
function UnsavedNotice({ reason, onRetry }: { reason: UnsavedReason; onRetry: () => void }) {
  return (
    // A status, not an alert: it stays while the user edits and shouldn't interrupt each time.
    <div role="status" className="mt-8 rounded-xl bg-coral-soft px-4 py-4 sm:px-6">
      <p className="font-semibold text-ink">{UNSAVED_MESSAGES[reason]}</p>
      <p className="mt-1 text-sm text-ink">It stays open in this tab. Delete trips you no longer need, then try again.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
        <ButtonLink to="/trips" variant="secondary">
          My trips
        </ButtonLink>
      </div>
    </div>
  )
}
