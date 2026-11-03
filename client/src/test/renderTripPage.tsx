import type { Trip } from '@travel-planner/shared'
import App from '../App.tsx'
import { HistoryBack } from './HistoryBack.tsx'
import { renderWithRouter } from './renderWithRouter.tsx'
import { seedTrips } from './seedTrips.ts'

/** Renders the whole app at `route` (the trip's page by default) with `trip` already saved. */
export function renderTripPage(trip: Trip, route = `/trips/${trip.id}`) {
  seedTrips([trip])
  return renderWithRouter(
    <>
      <App />
      <HistoryBack />
    </>,
    { route },
  )
}
