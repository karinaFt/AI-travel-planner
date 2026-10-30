import { ACTIVITY_CATEGORIES } from '@travel-planner/shared'
import { describe, expect, it } from 'vitest'
import { categoryLabel, formatDayDate, formatDuration, formatTimeRange } from './format.ts'

describe('itinerary format', () => {
  it('formats a time range on the same day', () => {
    expect(formatTimeRange('13:00', 90)).toBe('13:00–14:30')
    expect(formatTimeRange('09:05', 5)).toBe('09:05–09:10')
    expect(formatTimeRange('22:00', 119)).toBe('22:00–23:59')
  })

  it('marks a time range that ends at or after midnight', () => {
    expect(formatTimeRange('23:30', 90)).toBe('23:30–01:00 (next day)')
    expect(formatTimeRange('22:00', 120)).toBe('22:00–00:00 (next day)')
    expect(formatTimeRange('00:00', 1440)).toBe('00:00–00:00 (next day)')
    expect(formatTimeRange('23:59', 1440)).toBe('23:59–23:59 (next day)')
  })

  it('formats durations in hours and minutes', () => {
    expect(formatDuration(5)).toBe('5 min')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(90)).toBe('1 h 30 min')
    expect(formatDuration(1440)).toBe('24 h')
  })

  it('formats day dates without time zone shifts', () => {
    expect(formatDayDate('2026-11-11', 'short')).toBe('Wed, 11 Nov')
    expect(formatDayDate('2026-11-11', 'long')).toBe('Wednesday, 11 November')
    expect(formatDayDate('2027-01-01', 'short')).toBe('Fri, 1 Jan')
  })

  it('labels every activity category', () => {
    for (const category of ACTIVITY_CATEGORIES) {
      expect(categoryLabel(category)).toMatch(/^[A-Z][a-z]+$/)
    }
    expect(categoryLabel('sightseeing')).toBe('Sightseeing')
    expect(categoryLabel('other')).toBe('Other')
  })
})
