import type { Trip } from '@travel-planner/shared'
import App from '../App.tsx'
import { HistoryBack } from './HistoryBack.tsx'
import { renderWithRouter } from './renderWithRouter.tsx'

/** Renders the whole app at `route` (the trip's page by default) with `trip` already in the trip store. */
export function renderTripPage(trip: Trip, route = `/trips/${trip.id}`) {
  return renderWithRouter(
    <>
      <App initialTrips={[trip]} />
      <HistoryBack />
    </>,
    { route },
  )
}
