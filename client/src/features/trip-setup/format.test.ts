import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney, plural } from './format.ts'

describe('format', () => {
  it('formats ISO dates without time zone shifts', () => {
    expect(formatDate('2026-11-10')).toBe('10 Nov 2026')
    expect(formatDate('2026-01-01')).toBe('1 Jan 2026')
  })

  it('formats money in the chosen currency', () => {
    expect(formatMoney(1500, 'EUR')).toBe('€1,500.00')
    // Intl separates the currency code with a non-breaking space.
    expect(formatMoney(12000.5, 'UAH')).toBe('UAH 12,000.50')
    expect(formatMoney(50000, 'JPY')).toBe('¥50,000')
  })

  it('picks the singular or plural word', () => {
    expect(plural(1, 'day', 'days')).toBe('1 day')
    expect(plural(3, 'day', 'days')).toBe('3 days')
    expect(plural(0, 'interest', 'interests')).toBe('0 interests')
  })
})
