import { describe, expect, it } from 'vitest'
import { isIsoDate, tripLengthInDays } from './dates.ts'
import { MESSAGES, tripBasicsSchema } from './trip-basics.ts'

const valid = {
  destination: 'Lisbon',
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  budget: 1500,
  currency: 'EUR',
  travelers: 2,
}

/** First error message per field, the way the form shows them. */
function errors(input: Record<string, unknown>) {
  const result = tripBasicsSchema.safeParse(input)
  if (result.success) return {}
  const byField: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join('.')
    byField[field] ??= issue.message
  }
  return byField
}

describe('dates', () => {
  it.each([
    ['2026-11-10', true],
    ['2028-02-29', true],
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['2026-1-01', false],
    ['10.11.2026', false],
    ['', false],
    [20261110, false],
  ])('isIsoDate(%j) is %s', (value, expected) => {
    expect(isIsoDate(value)).toBe(expected)
  })

  it('counts both the start and the end day', () => {
    expect(tripLengthInDays('2026-11-10', '2026-11-10')).toBe(1)
    expect(tripLengthInDays('2026-11-10', '2026-11-12')).toBe(3)
    expect(tripLengthInDays('2026-11-12', '2026-11-10')).toBe(-1)
  })
})

describe('tripBasicsSchema', () => {
  it('accepts valid basics and trims the destination', () => {
    const result = tripBasicsSchema.parse({ ...valid, destination: '  Lisbon, Portugal  ' })

    expect(result).toEqual({ ...valid, destination: 'Lisbon, Portugal' })
  })

  describe('destination', () => {
    it.each([
      ['', MESSAGES.destinationRequired],
      ['   ', MESSAGES.destinationRequired],
      ['L', MESSAGES.destinationLength],
      ['x'.repeat(101), MESSAGES.destinationLength],
    ])('rejects %j', (destination, message) => {
      expect(errors({ ...valid, destination }).destination).toBe(message)
    })

    it.each(['Ro', 'x'.repeat(100), `  ${'x'.repeat(100)}  `])('accepts %j', (destination) => {
      expect(errors({ ...valid, destination }).destination).toBeUndefined()
    })
  })

  describe('dates', () => {
    it('accepts a single-day trip', () => {
      expect(errors({ ...valid, endDate: valid.startDate })).toEqual({})
    })

    it('accepts 14 days and rejects 15', () => {
      expect(errors({ ...valid, startDate: '2026-11-01', endDate: '2026-11-14' })).toEqual({})
      expect(errors({ ...valid, startDate: '2026-11-01', endDate: '2026-11-15' }).endDate).toBe(
        MESSAGES.tripTooLong,
      )
    })

    it('rejects an end date before the start date', () => {
      expect(errors({ ...valid, endDate: '2026-11-08' }).endDate).toBe(MESSAGES.endBeforeStart)
    })

    it('reports the date range even when other fields are invalid', () => {
      const result = errors({ ...valid, endDate: '2026-11-08', budget: 0, destination: '' })

      expect(result.endDate).toBe(MESSAGES.endBeforeStart)
      expect(result.budget).toBe(MESSAGES.budgetPositive)
    })

    it.each(['2026-02-30', '', 'tomorrow', undefined])('rejects start date %j', (startDate) => {
      expect(errors({ ...valid, startDate }).startDate).toBe(MESSAGES.invalidDate)
    })
  })

  describe('budget', () => {
    it.each([
      [0, MESSAGES.budgetPositive],
      [-200, MESSAGES.budgetPositive],
      [100.555, MESSAGES.budgetDecimals],
      [10_000_000.01, MESSAGES.budgetMax],
      [20_000_000, MESSAGES.budgetMax],
      [Number.NaN, MESSAGES.budgetFormat],
      [Number.POSITIVE_INFINITY, MESSAGES.budgetFormat],
      ['1500', MESSAGES.budgetFormat],
    ])('rejects %j', (budget, message) => {
      expect(errors({ ...valid, budget }).budget).toBe(message)
    })

    it.each([0.01, 0.29, 1500.5, 1234.56, 10_000_000])('accepts %j', (budget) => {
      expect(errors({ ...valid, budget }).budget).toBeUndefined()
    })
  })

  describe('currency', () => {
    it.each(['USD', 'EUR', 'GBP', 'UAH', 'PLN', 'CZK', 'CHF', 'JPY', 'CAD', 'AUD'])('accepts %s', (currency) => {
      expect(errors({ ...valid, currency }).currency).toBeUndefined()
    })

    it.each(['XYZ', 'eur', '', undefined])('rejects %j', (currency) => {
      expect(errors({ ...valid, currency }).currency).toBe(MESSAGES.currency)
    })
  })

  describe('travelers', () => {
    it.each([1, 20])('accepts %j', (travelers) => {
      expect(errors({ ...valid, travelers }).travelers).toBeUndefined()
    })

    it.each([0, 21, 2.5, -1, Number.NaN, '2'])('rejects %j', (travelers) => {
      expect(errors({ ...valid, travelers }).travelers).toBe(MESSAGES.travelers)
    })
  })
})
