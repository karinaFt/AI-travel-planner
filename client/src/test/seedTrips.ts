import type { Trip } from '@travel-planner/shared'
import { TRIPS_KEY } from '../features/trips/tripRepository.ts'

/** Saves `trips` in `localStorage` the way the app does, before the app is rendered. */
export function seedTrips(trips: readonly Trip[]) {
  localStorage.setItem(TRIPS_KEY, JSON.stringify({ version: 1, trips }))
}
