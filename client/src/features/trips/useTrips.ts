import { useCallback, useSyncExternalStore } from 'react'
import { useTripStore } from './tripStoreContext.ts'

/** Saved trips, newest first; re-renders when they change in this tab or another. */
export function useTripList() {
  const store = useTripStore()
  return useSyncExternalStore(store.subscribe, store.list)
}

/** The trip with `id`, and how many times another tab has changed it. */
export function useStoredTrip(id: string) {
  const store = useTripStore()
  const trip = useSyncExternalStore(
    store.subscribe,
    useCallback(() => store.get(id), [store, id]),
  )
  const revision = useSyncExternalStore(
    store.subscribe,
    useCallback(() => store.externalRevision(id), [store, id]),
  )
  return { trip, revision }
}

/** Why the trip with `id` isn't saved, or undefined when it is. */
export function useUnsavedReason(id: string) {
  const store = useTripStore()
  return useSyncExternalStore(
    store.subscribe,
    useCallback(() => store.unsavedReason(id), [store, id]),
  )
}
