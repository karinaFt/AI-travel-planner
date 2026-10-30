import { sumMoney, type Trip } from '@travel-planner/shared'
import { ButtonLink } from '../../components/ui/ButtonLink.tsx'
import { Card } from '../../components/ui/Card.tsx'
import { Container } from '../../components/ui/Container.tsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { DayTabs } from './DayTabs.tsx'
import { DayTimeline } from './DayTimeline.tsx'
import { TripOverview } from './TripOverview.tsx'
import { useSelectedDay } from './useSelectedDay.ts'

/** The day-by-day view of a generated trip. */
export function ItineraryView({ trip }: { trip: Trip }) {
  const { days } = trip.itinerary
  const { destination, currency } = trip.preferences
  const [selected, selectDay] = useSelectedDay(days.length)
  useDocumentTitle(`${destination} trip`)

  const dayCosts = days.map((day) => sumMoney(day.activities.map((activity) => activity.estimatedCost)))
  const day = days[selected - 1]

  return (
    <Container className="py-12 sm:py-16">
      <TripOverview trip={trip} estimatedCost={sumMoney(dayCosts)} />
      <Card as="section" aria-label="Itinerary" className="mt-10">
        <DayTabs days={days} selected={selected} onSelect={selectDay} />
        {/* A new key per day collapses every activity's details when the day changes. */}
        <DayTimeline key={day.id} day={day} estimatedCost={dayCosts[selected - 1]} currency={currency} />
      </Card>
      <ButtonLink to="/plan" variant="secondary" className="mt-8">
        Plan another trip
      </ButtonLink>
    </Container>
  )
}
