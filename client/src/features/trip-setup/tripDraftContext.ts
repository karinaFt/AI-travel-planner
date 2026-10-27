import { createContext, useContext } from 'react'
import type { TripPreferencesFormValues } from './formSchema.ts'

export type TripDraft = {
  /** The latest form values, or the defaults if nothing was entered yet. */
  get: () => TripPreferencesFormValues
  save: (values: TripPreferencesFormValues) => void
}

export const TripDraftContext = createContext<TripDraft | null>(null)

export function useTripDraft() {
  const draft = useContext(TripDraftContext)
  if (!draft) {
    throw new Error('useTripDraft must be used inside <TripDraftProvider>')
  }
  return draft
}
