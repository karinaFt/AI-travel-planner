import type { Trip } from '@travel-planner/shared'
import { createContext, useContext } from 'react'

export type SaveResult = 'saved' | 'limit' | 'failed'
/** Why a trip open in this tab isn't saved: the trip limit was reached, or storage refused the write. */
export type UnsavedReason = 'limit' | 'failed'

/**
 * Saved trips. Reads come from memory, so a trip that couldn't be saved still works for the tab.
 * `list`, `get`, `unsavedReason` and `externalRevision` return the same values until something changes,
 * so they can be used as `useSyncExternalStore` snapshots.
 */
export type TripStore = {
  get: (id: string) => Trip | undefined
  /** Newest first. */
  list: () => readonly Trip[]
  save: (trip: Trip) => SaveResult
  remove: (id: string) => 'removed' | 'failed'
  unsavedReason: (id: string) => UnsavedReason | undefined
  /** Grows each time another tab changes the trip; 0 when it never has. */
  externalRevision: (id: string) => number
  /** Saved trips that couldn't be read when the app loaded: a count, or "all" when the whole value was broken. */
  skipped: number | 'all'
  /** False when the browser doesn't let the app use `localStorage`. */
  available: boolean
  subscribe: (listener: () => void) => () => void
  /** Called with the key of a `storage` event, which other tabs cause. */
  handleStorageChange: (key: string | null) => void
}

export const TripStoreContext = createContext<TripStore | null>(null)

export function useTripStore() {
  const store = useContext(TripStoreContext)
  if (!store) {
    throw new Error('useTripStore must be used inside <TripStoreProvider>')
  }
  return store
}
