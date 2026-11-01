import { sumMoney, type Trip } from '@travel-planner/shared'
import { useCallback, useEffect, useState } from 'react'
import { ButtonLink } from '../../components/ui/ButtonLink.tsx'
import { Card } from '../../components/ui/Card.tsx'
import { Container } from '../../components/ui/Container.tsx'
import { BudgetSummary } from '../budget/BudgetSummary.tsx'
import { editTrip, type EditAction } from '../editing/editTrip.ts'
import { useTripStore } from '../trips/tripStoreContext.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { DayTabs } from './DayTabs.tsx'
import { DayTimeline } from './DayTimeline.tsx'
import { TripOverview } from './TripOverview.tsx'
import { useSelectedDay } from './useSelectedDay.ts'

/** Applies an edit and announces `message`; false when the edit was rejected and nothing changed. */
export type ApplyEdit = (action: EditAction, message: string) => boolean

/** The day-by-day view of a generated trip, which the user can edit. */
export function ItineraryView({ trip: initialTrip }: { trip: Trip }) {
  const store = useTripStore()
  const [trip, setTrip] = useState(initialTrip)
  // Kept with the day it was made on, so choosing another day clears it.
  const [status, setStatus] = useState<{ message: string; day: number } | null>(null)
  const { days } = trip.itinerary
  const { destination, budget, currency } = trip.preferences
  const [selected, selectDay] = useSelectedDay(days.length)
  useDocumentTitle(`${destination} trip`)

  // Every edit goes back to the store, so the trip page shows it again later in this tab.
  useEffect(() => {
    store.save(trip)
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
