import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderTripPage } from '../../test/renderTripPage.tsx'
import { fixturePreferences, tripFixture, type FixtureActivity } from '../../test/tripFixture.ts'

const costing = (estimatedCost: number, startTime = '10:00'): FixtureActivity => ({
  title: 'Activity',
  description: '',
  category: 'other',
  startTime,
  durationMinutes: 60,
  estimatedCost,
})

/** A Lisbon trip with this budget; by default each of its 3 days costs €40.00. */
const tripWith = (budget: number, days?: FixtureActivity[][]) =>
  tripFixture({ preferences: { ...fixturePreferences, budget }, days })

const card = () => screen.getByRole('region', { name: 'Budget' })

/** The card's amounts as { term: value }. */
const amounts = () =>
  Object.fromEntries(
    within(card())
      .getAllByRole('term')
      .map((term) => [term.textContent, term.nextElementSibling?.textContent]),
  )

describe('budget summary', () => {
  it('shows the budget, the estimated cost and what remains', () => {
    renderTripPage(tripWith(1500))

    expect(amounts()).toEqual({ Budget: '€1,500.00', 'Estimated cost': '€120.00', Remaining: '€1,380.00' })
    const meter = within(card()).getByRole('meter', { name: 'Budget used' })
    expect(meter).toHaveAttribute('aria-valuenow', '8')
    expect(meter).toHaveAttribute('aria-valuetext', '8% of budget')
    expect(meter.firstElementChild).toHaveStyle({ width: '8%' })
    expect(card()).toHaveTextContent('8% of budget')
  })

  it('counts exactly on budget as remaining nothing', () => {
    renderTripPage(tripWith(120))

    expect(amounts()).toMatchObject({ Remaining: '€0.00' })
    expect(card()).not.toHaveTextContent('Over budget')
    expect(within(card()).getByRole('meter')).toHaveAttribute('aria-valuetext', '100% of budget')
  })

  it('says by how much the plan is over budget', () => {
    renderTripPage(tripWith(100))

    expect(amounts()).toEqual({ Budget: '€100.00', 'Estimated cost': '€120.00', 'Over budget by': '€20.00' })
    const meter = within(card()).getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuenow', '100')
    expect(meter).toHaveAttribute('aria-valuetext', '120% of budget')
    expect(meter.firstElementChild).toHaveStyle({ width: '100%' })
    expect(card()).toHaveTextContent('120% of budget')
  })

  it('compares decimal costs with the budget exactly', () => {
    renderTripPage(tripWith(0.3, [[costing(0.1, '09:00'), costing(0.2)], [], []]))

    expect(amounts()).toEqual({ Budget: '€0.30', 'Estimated cost': '€0.30', Remaining: '€0.00' })
    expect(card()).not.toHaveTextContent('Over budget')
  })

  it('shows an empty bar for a plan that costs nothing', () => {
    renderTripPage(tripWith(1500, [[], [], []]))
    expect(within(card()).getByRole('meter').firstElementChild).toHaveStyle({ width: '0%' })
  })

  it('lists the cost of each day and the total', () => {
    renderTripPage(tripWith(1500, [[costing(15, '09:00'), costing(25)], [], [costing(80.5)]]))

    const table = within(card()).getByRole('table', { name: 'Cost by day' })
    const rows = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent))
    expect(rows).toEqual([
      ['Day 1', 'Tue, 10 Nov', 'Day title 1', '€40.00'],
      ['Day 2', 'Wed, 11 Nov', 'Day title 2', '€0.00'],
      ['Day 3', 'Thu, 12 Nov', 'Day title 3', '€80.50'],
      ['Total', '', '', '€120.50'],
    ])
  })
})
