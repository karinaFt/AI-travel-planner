import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fillPreferences, renderPlanPage, tripFields, validPreferences } from './testUtils.tsx'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-21T10:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

function reviewValue(label: string) {
  const term = screen.getByText(label, { selector: 'dt' })
  return term.nextElementSibling?.textContent
}

describe('Trip review', () => {
  it('shows every preference after a valid submit', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, {
      ...validPreferences,
      destination: '  Lisbon  ',
      origin: ' Kyiv ',
      travelStyle: 'food',
      pace: 'relaxed',
      interests: ['wine', 'markets'],
    })

    await user.click(tripFields.submit())

    expect(screen.getByRole('heading', { name: 'Review your trip' })).toHaveFocus()
    expect(reviewValue('Destination')).toBe('Lisbon')
    expect(reviewValue('Starting from')).toBe('Kyiv')
    expect(reviewValue('Dates')).toBe('10 Nov 2026 – 12 Nov 2026')
    expect(reviewValue('Length')).toBe('3 days')
    expect(reviewValue('Budget')).toBe('€1,500.00')
    expect(reviewValue('Travelers')).toBe('2 travelers')
    expect(reviewValue('Style')).toBe('Food')
    expect(reviewValue('Pace')).toBe('Relaxed')
    expect(reviewValue('Interests')).toBe('wine, markets')
    expect(screen.getByText(/generate a day-by-day itinerary/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Review trip' })).not.toBeInTheDocument()
  })

  it('marks optional values that were left empty', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, validPreferences)

    await user.click(tripFields.submit())

    expect(reviewValue('Starting from')).toBe('Not specified')
    expect(reviewValue('Interests')).toBe('None')
    expect(reviewValue('Pace')).toBe('Balanced')
  })

  it('formats other currencies and singular counts', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, {
      ...validPreferences,
      endDate: validPreferences.startDate,
      budget: '12000.5',
      currency: 'UAH',
      travelers: '1',
    })

    await user.click(tripFields.submit())

    expect(reviewValue('Length')).toBe('1 day')
    // Intl separates the currency code with a non-breaking space.
    expect(reviewValue('Budget')).toBe('UAH 12,000.50')
    expect(reviewValue('Travelers')).toBe('1 traveler')
  })

  it('returns to the form with every value kept', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, {
      ...validPreferences,
      origin: 'Kyiv',
      currency: 'PLN',
      pace: 'packed',
      interests: ['street art'],
    })
    await user.click(tripFields.submit())

    await user.click(screen.getByRole('button', { name: 'Edit details' }))

    expect(screen.queryByRole('heading', { name: 'Review your trip' })).not.toBeInTheDocument()
    expect(tripFields.destination()).toHaveFocus()
    expect(tripFields.destination()).toHaveValue('Lisbon')
    expect(tripFields.origin()).toHaveValue('Kyiv')
    expect(tripFields.startDate()).toHaveValue('2026-11-10')
    expect(tripFields.endDate()).toHaveValue('2026-11-12')
    expect(tripFields.budget()).toHaveValue('1500')
    expect(tripFields.currency()).toHaveValue('PLN')
    expect(tripFields.travelers()).toHaveValue('2')
    expect(screen.getByRole('radio', { name: 'Food' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Packed' })).toBeChecked()
    expect(
      within(screen.getByRole('list', { name: 'Your interests' })).getByText('street art'),
    ).toBeInTheDocument()
  })
})
