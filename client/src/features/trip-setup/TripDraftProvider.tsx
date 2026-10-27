import { useRef, useState, type ReactNode } from 'react'
import { emptyTripPreferencesForm, type TripPreferencesFormValues } from './formSchema.ts'
import { TripDraftContext, type TripDraft } from './tripDraftContext.ts'

/**
 * Keeps the trip form values for as long as the app is open in this tab, so
 * leaving /plan and coming back does not lose them. Not kept across reloads.
 *
 * The values live in a ref: saving on every keystroke re-renders nothing, and
 * the form only reads them when it mounts.
 */
export function TripDraftProvider({ children }: { children: ReactNode }) {
  const values = useRef<TripPreferencesFormValues>(emptyTripPreferencesForm)
  const [draft] = useState<TripDraft>(() => ({
    get: () => values.current,
    save: (next) => {
      values.current = next
    },
  }))

  return <TripDraftContext.Provider value={draft}>{children}</TripDraftContext.Provider>
}
