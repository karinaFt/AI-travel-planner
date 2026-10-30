import type { Trip } from '@travel-planner/shared'
import { createContext, useContext } from 'react'

/** Generated trips by ID. Saving trips across reloads will replace the implementation, not this shape. */
export type TripStore = {
  get: (id: string) => Trip | undefined
  save: (trip: Trip) => void
}

export const TripStoreContext = createContext<TripStore | null>(null)

export function useTripStore() {
  const store = useContext(TripStoreContext)
  if (!store) {
    throw new Error('useTripStore must be used inside <TripStoreProvider>')
  }
  return store
}
