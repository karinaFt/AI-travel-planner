import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderTripPage } from '../../test/renderTripPage.tsx'
import { fixturePreferences, tripFixture, type FixtureActivity } from '../../test/tripFixture.ts'

const activity = (overrides: Partial<FixtureActivity>): FixtureActivity => ({
  title: 'Activity',
  description: '',
  category: 'other',
  startTime: '10:00',
  durationMinutes: 60,
  estimatedCost: 0,
  ...overrides,
})

const breakfast = activity({ title: 'Breakfast', category: 'food', startTime: '09:00', estimatedCost: 20 })
const castle = activity({
  title: 'Castle visit',
  category: 'sightseeing',
  startTime: '11:00',
  durationMinutes: 90,
  description: 'Walk the walls of the old castle.',
})
const lateShow = activity({ title: 'Late show', category: 'nightlife', startTime: '23:30', durationMinutes: 90 })

const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}\\b`) })
const panel = () => screen.getByRole('tabpanel')

describe('trip overview', () => {
  it('shows the trip facts, the estimated cost and the budget', () => {
    renderTripPage(tripFixture())

    expect(screen.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeInTheDocument()
    const facts = Object.fromEntries(
      screen.getAllByRole('term').map((term) => [term.textContent, term.nextElementSibling?.textContent]),
    )
    expect(facts).toEqual({
      Dates: '10 Nov 2026 – 12 Nov 2026 · 3 days',
      Travelers: '2 travelers',
      Style: 'Food',
      Pace: 'Relaxed',
      'Starting from': 'Kyiv',
      'Estimated cost': '€120.00',
      Budget: '€1,500.00',
    })
    expect(document.title).toBe('Lisbon trip · AI Travel Planner')
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Plan another trip' })).toHaveAttribute('href', '/plan')
  })

  it('leaves out the starting point when there is none', () => {
    renderTripPage(tripFixture({ preferences: { ...fixturePreferences, origin: undefined } }))
    expect(screen.queryByText('Starting from')).not.toBeInTheDocument()
  })
})

describe('day tabs', () => {
  it('shows one tab per day with day 1 selected and only it tabbable', () => {
    renderTripPage(tripFixture())

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Day 1 Tue, 10 Nov', 'Day 2 Wed, 11 Nov', 'Day 3 Thu, 12 Nov'])
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false'])
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1])
    expect(panel()).toHaveAccessibleName(/^Day 1/)
  })

  it('shows the chosen day and keeps focus on its tab', async () => {
    const user = userEvent.setup()
    renderTripPage(tripFixture())

    await user.click(tab('Day 2'))

    expect(tab('Day 2')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Day 2')).toHaveFocus()
    expect(panel()).toHaveTextContent('Day title 2')
  })

  it('moves with the arrow keys, wrapping around, and with Home and End', async () => {
    const user = userEvent.setup()
    renderTripPage(tripFixture(), `/trips/${tripFixture().id}?day=3`)

    await user.click(tab('Day 3'))
    await user.keyboard('{ArrowRight}')
    expect(tab('Day 1')).toHaveFocus()
    expect(tab('Day 1')).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowLeft}')
    expect(tab('Day 3')).toHaveFocus()
    expect(tab('Day 3')).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Home}')
    expect(tab('Day 1')).toHaveFocus()
    await user.keyboard('{End}')
    expect(tab('Day 3')).toHaveFocus()
    expect(panel()).toHaveTextContent('Day title 3')
  })

  it('puts only the selected tab in the Tab order', async () => {
    const user = userEvent.setup()
    renderTripPage(tripFixture(), `/trips/${tripFixture().id}?day=2`)

    screen.getByRole('heading', { level: 1 }).focus()
    await user.tab()
    expect(tab('Day 2')).toHaveFocus()
    await user.tab()
    expect(panel()).toHaveFocus()
  })
})

describe('selected day in the URL', () => {
  it('opens the day named in the URL', () => {
    renderTripPage(tripFixture(), `/trips/${tripFixture().id}?day=3`)
    expect(tab('Day 3')).toHaveAttribute('aria-selected', 'true')
  })

  it.each(['9', '0', 'abc', '2.5', ''])('selects day 1 for day=%s', (day) => {
    renderTripPage(tripFixture(), `/trips/${tripFixture().id}?day=${day}`)
    expect(tab('Day 1')).toHaveAttribute('aria-selected', 'true')
  })

  it('goes back to the previous day', async () => {
    const user = userEvent.setup()
    renderTripPage(tripFixture())

    await user.click(tab('Day 2'))
    await user.click(tab('Day 3'))
    await user.click(screen.getByRole('button', { name: 'Test back' }))
    expect(tab('Day 2')).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('button', { name: 'Test back' }))
    expect(tab('Day 1')).toHaveAttribute('aria-selected', 'true')
  })
})

describe('day timeline', () => {
  it('lists the activities in order with time, category and cost', () => {
    renderTripPage(tripFixture({ days: [[breakfast, castle]] }))

    expect(within(panel()).getByRole('heading', { level: 2 })).toHaveTextContent('Day 1 · Tuesday, 10 November')
    expect(panel()).toHaveTextContent('Day title 1')
    expect(panel()).toHaveTextContent('2 activities · Estimated €20.00')
    const items = within(panel()).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent(/^09:00Breakfast€20\.00Food/)
    expect(items[1]).toHaveTextContent(/^11:00Castle visitFreeSightseeing/)
  })

  it('adds decimal costs exactly', () => {
    const costs = [0.1, 0.2, 19.99].map((estimatedCost, i) => activity({ startTime: `1${i}:00`, estimatedCost }))
    renderTripPage(tripFixture({ days: [costs, [], []] }))

    expect(panel()).toHaveTextContent('3 activities · Estimated €20.29')
    expect(screen.getByText('€20.29', { selector: 'dd' })).toBeInTheDocument()
  })

  it('says when a day has no activities', async () => {
    const user = userEvent.setup()
    renderTripPage(tripFixture({ days: [[breakfast], []] }))

    await user.click(tab('Day 2'))

    expect(panel()).toHaveTextContent('No activities are planned for this day.')
    expect(panel()).toHaveTextContent('0 activities · Estimated €0.00')
    expect(within(panel()).queryByRole('list')).not.toBeInTheDocument()
  })
})

describe('activity details', () => {
  it('expands and collapses in place', async () => {
    const user = userEvent.setup()
    renderTripPage(tripFixture({ days: [[castle]] }))

    const toggle = screen.getByRole('button', { name: 'Details for Castle visit' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('11:00–12:30 · 1 h 30 min')).not.toBeVisible()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAccessibleName('Hide details for Castle visit')
    expect(screen.getByText('11:00–12:30 · 1 h 30 min')).toBeVisible()
    expect(screen.getByText('Walk the walls of the old castle.')).toBeVisible()
    expect(screen.getByText('Estimated cost for the whole group.')).toBeVisible()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Walk the walls of the old castle.')).not.toBeVisible()
  })

  it('marks an activity that ends after midnight and shows no empty description', async () => {
    const user = userEvent.setup()
    renderTripPage(tripFixture({ days: [[lateShow]] }))

    await user.click(screen.getByRole('button', { name: 'Details for Late show' }))

    const details = screen.getByText('23:30–01:00 (next day) · 1 h 30 min').parentElement!
    expect(details.children).toHaveLength(2)
  })

  it('shows the next day collapsed', async () => {
    const user = userEvent.setup()
    renderTripPage(tripFixture({ days: [[castle], [castle]] }))

    await user.click(screen.getByRole('button', { name: 'Details for Castle visit' }))
    await user.click(tab('Day 2'))

    expect(screen.getByRole('button', { name: 'Details for Castle visit' })).toHaveAttribute('aria-expanded', 'false')
  })
})
