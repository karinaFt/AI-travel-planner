import { describe, expect, it } from 'vitest'
import { MESSAGES } from './trip-basics.ts'
import { PREFERENCE_MESSAGES, hasInterest, tripPreferencesSchema } from './trip-preferences.ts'

const valid = {
  destination: 'Lisbon',
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  budget: 1500,
  currency: 'EUR',
  travelers: 2,
  origin: 'Kyiv',
  travelStyle: 'food',
  pace: 'relaxed',
  interests: ['wine', 'markets'],
}

function errors(input: Record<string, unknown>) {
  const result = tripPreferencesSchema.safeParse(input)
  if (result.success) return {}
  const byField: Record<string, string> = {}
  for (const issue of result.error.issues) {
    byField[issue.path.join('.')] ??= issue.message
  }
  return byField
}

describe('tripPreferencesSchema', () => {
  it('accepts valid preferences', () => {
    expect(tripPreferencesSchema.parse(valid)).toEqual(valid)
  })

  it('keeps the trip basics rules, including the date range', () => {
    expect(errors({ ...valid, endDate: '2026-11-08' }).endDate).toBe(MESSAGES.endBeforeStart)
    expect(errors({ ...valid, endDate: '2026-11-08', travelStyle: 'party' }).endDate).toBe(
      MESSAGES.endBeforeStart,
    )
    expect(errors({ ...valid, budget: 0 }).budget).toBe(MESSAGES.budgetPositive)
  })

  describe('origin', () => {
    it.each(['', '   ', undefined])('treats %j as not provided', (origin) => {
      const parsed = tripPreferencesSchema.parse({ ...valid, origin })

      expect(parsed.origin).toBeUndefined()
    })

    it('trims a provided origin', () => {
      expect(tripPreferencesSchema.parse({ ...valid, origin: '  Kyiv  ' }).origin).toBe('Kyiv')
    })

    it.each(['K', ' K ', 'x'.repeat(101), 42])('rejects %j', (origin) => {
      expect(errors({ ...valid, origin }).origin).toBe(PREFERENCE_MESSAGES.originLength)
    })

    it.each(['Ky', 'x'.repeat(100)])('accepts %j', (origin) => {
      expect(errors({ ...valid, origin }).origin).toBeUndefined()
    })
  })

  describe('travel style and pace', () => {
    it.each(['relaxation', 'adventure', 'culture', 'food', 'nature'])('accepts style %s', (travelStyle) => {
      expect(errors({ ...valid, travelStyle })).toEqual({})
    })

    it.each(['', 'party', 'Food', undefined])('rejects style %j', (travelStyle) => {
      expect(errors({ ...valid, travelStyle }).travelStyle).toBe(PREFERENCE_MESSAGES.travelStyle)
    })

    it.each(['relaxed', 'balanced', 'packed'])('accepts pace %s', (pace) => {
      expect(errors({ ...valid, pace })).toEqual({})
    })

    it.each(['', 'slow', undefined])('rejects pace %j', (pace) => {
      expect(errors({ ...valid, pace }).pace).toBe(PREFERENCE_MESSAGES.pace)
    })
  })

  describe('interests', () => {
    const ten = Array.from({ length: 10 }, (_, i) => `interest ${i}`)

    it('accepts an empty list and a list of ten', () => {
      expect(errors({ ...valid, interests: [] })).toEqual({})
      expect(errors({ ...valid, interests: ten })).toEqual({})
    })

    it('rejects an eleventh interest', () => {
      expect(errors({ ...valid, interests: [...ten, 'one more'] }).interests).toBe(
        PREFERENCE_MESSAGES.interestCount,
      )
    })

    it.each(['a', ' a ', 'x'.repeat(41)])('rejects interest %j', (interest) => {
      expect(errors({ ...valid, interests: ['wine', interest] })['interests.1']).toBe(
        PREFERENCE_MESSAGES.interestLength,
      )
    })

    it('rejects duplicates ignoring case and spaces', () => {
      expect(errors({ ...valid, interests: ['museums', ' Museums '] })['interests.1']).toBe(
        PREFERENCE_MESSAGES.interestDuplicate,
      )
    })

    it('trims interests', () => {
      expect(tripPreferencesSchema.parse({ ...valid, interests: [' street art '] }).interests).toEqual([
        'street art',
      ])
    })

    it('rejects a missing list', () => {
      expect(errors({ ...valid, interests: undefined }).interests).toBeDefined()
    })
  })
})

describe('hasInterest', () => {
  it('matches ignoring case and surrounding spaces', () => {
    expect(hasInterest(['Museums'], ' museums ')).toBe(true)
    expect(hasInterest(['Museums'], 'music')).toBe(false)
  })
})
