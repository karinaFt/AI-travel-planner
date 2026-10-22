import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fillBasics, renderPlanPage, tripFields, validBasics } from './testUtils.tsx'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-21T10:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

function summaryValue(label: string) {
  const term = screen.getByText(label, { selector: 'dt' })
  return term.nextElementSibling?.textContent
}

describe('Trip basics summary', () => {
  it('shows the normalized basics after a valid submit', async () => {
    const user = renderPlanPage()
    await fillBasics(user, { ...validBasics, destination: '  Lisbon  ' })

    await user.click(tripFields.submit())

    const heading = screen.getByRole('heading', { name: 'Your trip so far' })
    expect(heading).toHaveFocus()
    expect(summaryValue('Destination')).toBe('Lisbon')
    expect(summaryValue('Dates')).toBe('10 Nov 2026 – 12 Nov 2026')
    expect(summaryValue('Length')).toBe('3 days')
    expect(summaryValue('Budget')).toBe('€1,500.00')
    expect(summaryValue('Travelers')).toBe('2 travelers')
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
  })

  it('formats other currencies and singular counts', async () => {
    const user = renderPlanPage()
    await fillBasics(user, {
      ...validBasics,
      endDate: validBasics.startDate,
      budget: '12000.5',
      currency: 'UAH',
      travelers: '1',
    })

    await user.click(tripFields.submit())

    expect(summaryValue('Length')).toBe('1 day')
    // Intl separates the currency code with a non-breaking space.
    expect(summaryValue('Budget')).toBe('UAH 12,000.50')
    expect(summaryValue('Travelers')).toBe('1 traveler')
  })

  it('returns to the form with every value kept', async () => {
    const user = renderPlanPage()
    await fillBasics(user, { ...validBasics, currency: 'PLN' })
    await user.click(tripFields.submit())

    await user.click(screen.getByRole('button', { name: 'Edit details' }))

    expect(screen.queryByRole('heading', { name: 'Your trip so far' })).not.toBeInTheDocument()
    expect(tripFields.destination()).toHaveFocus()
    expect(tripFields.destination()).toHaveValue('Lisbon')
    expect(tripFields.startDate()).toHaveValue('2026-11-10')
    expect(tripFields.endDate()).toHaveValue('2026-11-12')
    expect(tripFields.budget()).toHaveValue('1500')
    expect(tripFields.currency()).toHaveValue('PLN')
    expect(tripFields.travelers()).toHaveValue('2')
  })

  it('keeps the summary inside the plan page card', async () => {
    const user = renderPlanPage()
    await fillBasics(user, validBasics)
    await user.click(tripFields.submit())

    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { level: 1, name: 'Plan a trip' })).toBeInTheDocument()
  })
})
