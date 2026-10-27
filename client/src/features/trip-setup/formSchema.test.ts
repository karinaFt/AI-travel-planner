import { MESSAGES, PREFERENCE_MESSAGES } from '@travel-planner/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  START_IN_PAST_MESSAGE,
  emptyTripPreferencesForm,
  tripPreferencesFormSchema,
  type TripPreferencesFormValues,
} from './formSchema.ts'

const valid: TripPreferencesFormValues = {
  destination: 'Lisbon',
  origin: '',
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  budget: '1500',
  currency: 'EUR',
  travelers: '2',
  travelStyle: 'food',
  pace: 'balanced',
  interests: [],
}

function errors(overrides: Partial<TripPreferencesFormValues>) {
  const result = tripPreferencesFormSchema.safeParse({ ...valid, ...overrides })
  if (result.success) return {}
  const byField: Record<string, string> = {}
  for (const issue of result.error.issues) {
    byField[issue.path.join('.')] ??= issue.message
  }
  return byField
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-21T10:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('tripPreferencesFormSchema', () => {
  it('turns raw values into normalized trip preferences', () => {
    expect(
      tripPreferencesFormSchema.parse({
        ...valid,
        destination: '  Lisbon, Portugal  ',
        origin: '  Kyiv ',
        budget: ' 1500.5 ',
        travelers: ' 2 ',
        pace: 'relaxed',
        interests: [' wine ', 'markets'],
      }),
    ).toEqual({
      destination: 'Lisbon, Portugal',
      origin: 'Kyiv',
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      budget: 1500.5,
      currency: 'EUR',
      travelers: 2,
      travelStyle: 'food',
      pace: 'relaxed',
      interests: ['wine', 'markets'],
    })
  })

  it('starts with EUR, 1 traveler, balanced pace and nothing else chosen', () => {
    expect(emptyTripPreferencesForm).toMatchObject({
      currency: 'EUR',
      travelers: '1',
      pace: 'balanced',
      travelStyle: '',
      origin: '',
      interests: [],
    })
  })

  describe('preferences', () => {
    it('drops an empty starting point', () => {
      expect(tripPreferencesFormSchema.parse({ ...valid, origin: '   ' }).origin).toBeUndefined()
    })

    it('rejects a one-letter starting point', () => {
      expect(errors({ origin: 'K' }).origin).toBe(PREFERENCE_MESSAGES.originLength)
    })

    it('asks for a travel style when none is chosen', () => {
      expect(errors({ travelStyle: '' }).travelStyle).toBe(PREFERENCE_MESSAGES.travelStyle)
    })

    it.each(['', 'slow'])('rejects pace %j', (pace) => {
      expect(errors({ pace }).pace).toBe(PREFERENCE_MESSAGES.pace)
    })

    it('rejects duplicate interests', () => {
      expect(errors({ interests: ['Museums', 'museums'] })['interests.1']).toBe(
        PREFERENCE_MESSAGES.interestDuplicate,
      )
    })
  })

  describe('budget', () => {
    it.each(['abc', '12,5,0', '1e5', '1e400', 'Infinity', '+3', '', '   ', '1 500'])(
      'rejects %j as not a number',
      (budget) => {
        expect(errors({ budget }).budget).toBe(MESSAGES.budgetFormat)
      },
    )

    it.each([
      ['0', MESSAGES.budgetPositive],
      ['-200', MESSAGES.budgetPositive],
      ['100.555', MESSAGES.budgetDecimals],
      ['20000000', MESSAGES.budgetMax],
    ])('rejects %j with a specific message', (budget, message) => {
      expect(errors({ budget }).budget).toBe(message)
    })
  })

  describe('travelers', () => {
    it.each(['0', '21', '2.5', 'two', '', '1e1'])('rejects %j', (travelers) => {
      expect(errors({ travelers }).travelers).toBe(MESSAGES.travelers)
    })

    it.each(['1', '20'])('accepts %j', (travelers) => {
      expect(errors({ travelers }).travelers).toBeUndefined()
    })
  })

  describe('dates', () => {
    it('rejects a start date before today', () => {
      expect(errors({ startDate: '2026-10-20', endDate: '2026-10-22' }).startDate).toBe(
        START_IN_PAST_MESSAGE,
      )
    })

    it('accepts a trip starting today', () => {
      expect(errors({ startDate: '2026-10-21', endDate: '2026-10-21' })).toEqual({})
    })

    it('rejects an end date before the start date', () => {
      expect(errors({ endDate: '2026-11-08' }).endDate).toBe(MESSAGES.endBeforeStart)
    })

    it('accepts 14 days and rejects 15', () => {
      expect(errors({ startDate: '2026-11-01', endDate: '2026-11-14' })).toEqual({})
      expect(errors({ startDate: '2026-11-01', endDate: '2026-11-15' }).endDate).toBe(
        MESSAGES.tripTooLong,
      )
    })

    it('reports date problems even when other fields are invalid', () => {
      const result = errors({ startDate: '2026-10-01', endDate: '2026-09-30', budget: 'abc' })

      expect(result.startDate).toBe(START_IN_PAST_MESSAGE)
      expect(result.endDate).toBe(MESSAGES.endBeforeStart)
      expect(result.budget).toBe(MESSAGES.budgetFormat)
    })

    it.each(['', '2026-02-30'])('rejects %j as an invalid date', (startDate) => {
      expect(errors({ startDate }).startDate).toBe(MESSAGES.invalidDate)
    })
  })

  it('rejects an unsupported currency', () => {
    expect(errors({ currency: 'XYZ' }).currency).toBe(MESSAGES.currency)
  })

  it('rejects an empty destination', () => {
    expect(errors({ destination: '   ' }).destination).toBe(MESSAGES.destinationRequired)
  })
})
