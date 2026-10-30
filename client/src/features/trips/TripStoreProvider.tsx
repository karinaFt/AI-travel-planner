import type { Trip } from '@travel-planner/shared'
import { useRef, useState, type ReactNode } from 'react'
import { TripStoreContext, type TripStore } from './tripStoreContext.ts'

/**
 * Keeps generated trips for as long as the app is open in this tab. Not kept across reloads.
 *
 * Trips are saved right before navigating to their page, which reads them on render, so a ref is enough.
 */
export function TripStoreProvider({
  initialTrips = [],
  children,
}: {
  /** Trips the store starts with; used by tests. */
  initialTrips?: readonly Trip[]
  children: ReactNode
}) {
  const trips = useRef(new Map<string, Trip>(initialTrips.map((trip) => [trip.id, trip])))
  const [store] = useState<TripStore>(() => ({
    get: (id) => trips.current.get(id),
    save: (trip) => {
      trips.current.set(trip.id, trip)
    },
  }))

  return <TripStoreContext.Provider value={store}>{children}</TripStoreContext.Provider>
}
