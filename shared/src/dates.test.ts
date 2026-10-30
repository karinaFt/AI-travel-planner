import { describe, expect, it } from 'vitest'
import { tripDates } from './dates.ts'

describe('tripDates', () => {
  it('lists every date from the start to the end, inclusive', () => {
    expect(tripDates('2026-11-10', '2026-11-12')).toEqual(['2026-11-10', '2026-11-11', '2026-11-12'])
    expect(tripDates('2026-11-10', '2026-11-10')).toEqual(['2026-11-10'])
  })

  it('crosses month, year and leap-day boundaries', () => {
    expect(tripDates('2026-10-31', '2026-11-01')).toEqual(['2026-10-31', '2026-11-01'])
    expect(tripDates('2026-12-31', '2027-01-01')).toEqual(['2026-12-31', '2027-01-01'])
    expect(tripDates('2028-02-28', '2028-03-01')).toEqual(['2028-02-28', '2028-02-29', '2028-03-01'])
  })

  it('is empty when the end is before the start', () => {
    expect(tripDates('2026-11-12', '2026-11-10')).toEqual([])
  })
})
