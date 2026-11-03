import { useEffect, useState, type ReactNode } from 'react'
import { createTripStore } from './createTripStore.ts'
import { TripStoreContext } from './tripStoreContext.ts'

/** Saves trips in this browser's `localStorage` and follows changes other tabs make to them. */
export function TripStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createTripStore(getLocalStorage()))

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === null || event.storageArea === window.localStorage) {
        store.handleStorageChange(event.key)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [store])

  return <TripStoreContext.Provider value={store}>{children}</TripStoreContext.Provider>
}

/** `localStorage`, or null when the browser blocks it: reading the property itself can throw. */
function getLocalStorage(): Storage | null {
  try {
    const storage = window.localStorage
    return storage ?? null
  } catch {
    return null
  }
}
