import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/**
 * The selected day number, kept in the `day` query parameter. A missing, non-numeric or out-of-range
 * value means day 1 and is left in the URL as it is. Selecting a day adds a history entry.
 */
export function useSelectedDay(dayCount: number) {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('day') ?? ''
  const parsed = /^\d+$/.test(raw) ? Number(raw) : NaN
  const day = parsed >= 1 && parsed <= dayCount ? parsed : 1

  const selectDay = useCallback(
    (next: number) => setSearchParams({ day: String(next) }, { preventScrollReset: true }),
    [setSearchParams],
  )

  return [day, selectDay] as const
}
