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
const lunch = activity({ title: 'Lunch', category: 'food', startTime: '13:00', estimatedCost: 40 })
const dinner = activity({ title: 'Dinner', category: 'food', startTime: '19:00', estimatedCost: 60 })

/** Lisbon, budget 1500 EUR. Day 1: Breakfast 09:00 €20, Lunch 13:00 €40. Day 2: Dinner 19:00 €60. Day 3: empty. */
const trip = (days: FixtureActivity[][] = [[breakfast, lunch], [dinner], []]) =>
  tripFixture({ preferences: { ...fixturePreferences, budget: 1500 }, days })

const panel = () => screen.getByRole('tabpanel')
const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}\\b`) })
const status = () => screen.getByRole('status')
const listed = () =>
  within(panel())
    .queryAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent)
const budget = () => screen.getByRole('region', { name: 'Budget' })
const costRow = (day: string) => within(budget()).getByRole('rowheader', { name: day }).closest('tr')!
const form = (name: string) => screen.getByRole('form', { name })

/** Replaces the text of a field in `container`. */
async function fill(user: ReturnType<typeof userEvent.setup>, container: HTMLElement, label: RegExp | string, text: string) {
  const field = within(container).getByLabelText(label)
  await user.clear(field)
  if (text) await user.type(field, text)
}

describe('editing an activity', () => {
  it('saves a new cost and updates the day cost and the budget', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))
    const edit = form('Edit Lunch')
    expect(within(edit).getByLabelText('Title')).toHaveFocus()
    expect(within(edit).getByLabelText('Title')).toHaveValue('Lunch')
    expect(within(edit).getByLabelText('Estimated cost (EUR)')).toHaveValue('40')
    expect(within(edit).getByText('For the whole group')).toBeInTheDocument()

    await fill(user, edit, 'Estimated cost (EUR)', '25.50')
    await user.click(within(edit).getByRole('button', { name: 'Save activity' }))

    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(panel()).toHaveTextContent('€25.50')
    expect(panel()).toHaveTextContent('2 activities · Estimated €45.50')
    expect(costRow('Day 1')).toHaveTextContent('€45.50')
    expect(budget()).toHaveTextContent('Remaining€1,394.50')
    expect(screen.getByRole('button', { name: 'Edit Lunch' })).toHaveFocus()
    expect(status()).toHaveTextContent('Saved "Lunch".')
  })

  it('cancels without changes and returns focus to Edit', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))
    await fill(user, form('Edit Lunch'), 'Title', 'Brunch')
    await user.click(within(form('Edit Lunch')).getByRole('button', { name: 'Cancel' }))

    expect(listed()).toEqual(['Breakfast', 'Lunch'])
    expect(screen.getByRole('button', { name: 'Edit Lunch' })).toHaveFocus()
    expect(status()).toBeEmptyDOMElement()
  })

  it('shows an error on each invalid field and focuses the first one', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))
    const edit = form('Edit Lunch')
    await fill(user, edit, 'Title', '')
    await fill(user, edit, /Start time/, '25:00')
    await fill(user, edit, 'Duration in minutes', '3')
    await fill(user, edit, /Estimated cost/, '12.345')
    await user.click(within(edit).getByRole('button', { name: 'Save activity' }))

    expect(within(edit).getByLabelText('Title')).toHaveAccessibleDescription('Enter a title')
    expect(within(edit).getByLabelText(/Start time/)).toHaveAccessibleDescription(
      '24-hour, e.g. 09:30 Enter a 24-hour time like 09:30',
    )
    expect(within(edit).getByLabelText('Duration in minutes')).toHaveAccessibleDescription(
      'Enter whole minutes from 5 to 1440',
    )
    expect(within(edit).getByLabelText(/Estimated cost/)).toHaveAccessibleDescription(
      'For the whole group Use at most 2 decimal places',
    )
    expect(within(edit).getByLabelText('Title')).toHaveFocus()
    expect(costRow('Day 1')).toHaveTextContent('€60.00')
  })

  it('shows text in a numeric field as an error', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))
    const edit = form('Edit Lunch')
    await fill(user, edit, 'Duration in minutes', 'abc')
    await user.click(within(edit).getByRole('button', { name: 'Save activity' }))

    const duration = within(edit).getByLabelText('Duration in minutes')
    expect(duration).toHaveAttribute('inputmode', 'numeric')
    expect(duration).toHaveAccessibleDescription('Enter whole minutes from 5 to 1440')
    expect(duration).toHaveFocus()
  })

  it('re-sorts the day when the start time changes', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Edit Breakfast' }))
    await fill(user, form('Edit Breakfast'), /Start time/, '14:00')
    await user.click(screen.getByRole('button', { name: 'Save activity' }))

    expect(listed()).toEqual(['Lunch', 'Breakfast'])
  })

  it('keeps only one form open', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Edit Breakfast' }))
    await fill(user, form('Edit Breakfast'), 'Title', 'Changed')
    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))

    expect(screen.getAllByRole('form')).toHaveLength(1)
    expect(form('Edit Lunch')).toBeInTheDocument()
    expect(listed()).toEqual(['Breakfast'])
  })
})

describe('moving an activity', () => {
  it('moves it to another day in start-time order', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))
    await user.selectOptions(within(form('Edit Lunch')).getByLabelText('Day'), 'Day 2 · Wed, 11 Nov')
    await user.click(screen.getByRole('button', { name: 'Save activity' }))

    expect(listed()).toEqual(['Breakfast'])
    expect(status()).toHaveTextContent('Moved "Lunch" to Day 2.')
    expect(panel()).toHaveFocus()
    expect(costRow('Day 1')).toHaveTextContent('€20.00')
    expect(costRow('Day 2')).toHaveTextContent('€100.00')

    await user.click(tab('Day 2'))
    expect(listed()).toEqual(['Lunch', 'Dinner'])
    expect(status()).toBeEmptyDOMElement()
  })

  it('does not offer a full day', async () => {
    const user = userEvent.setup()
    const twenty = Array.from({ length: 20 }, (_, i) => activity({ title: `Stop ${i + 1}` }))
    renderTripPage(trip([[lunch], [dinner], twenty]))

    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))
    const day = within(form('Edit Lunch')).getByLabelText('Day')
    expect(within(day).getByRole('option', { name: 'Day 3 · Thu, 12 Nov (full)' })).toBeDisabled()
    expect(within(day).getByRole('option', { name: 'Day 2 · Wed, 11 Nov' })).toBeEnabled()
  })
})

describe('adding an activity', () => {
  it('adds an activity to the selected day', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Add activity' }))
    const add = form('New activity')
    expect(within(add).getByLabelText('Title')).toHaveFocus()
    expect(within(add).getByLabelText('Day')).toHaveDisplayValue('Day 1 · Tue, 10 Nov')
    expect(within(add).getByLabelText('Category')).toHaveDisplayValue('Other')
    expect(within(add).getByLabelText('Duration in minutes')).toHaveValue('60')

    await user.type(within(add).getByLabelText('Title'), 'Tram 28')
    await user.type(within(add).getByLabelText(/Start time/), '10:00')
    await fill(user, add, 'Duration in minutes', '30')
    await user.selectOptions(within(add).getByLabelText('Category'), 'Transport')
    await user.type(within(add).getByLabelText(/Estimated cost/), '3')
    await user.click(within(add).getByRole('button', { name: 'Add activity' }))

    expect(listed()).toEqual(['Breakfast', 'Tram 28', 'Lunch'])
    const item = screen.getByRole('heading', { name: 'Tram 28' }).closest('li')!
    expect(item).toHaveTextContent('10:00')
    expect(item).toHaveTextContent('Transport')
    expect(item).toHaveTextContent('€3.00')
    expect(panel()).toHaveTextContent('3 activities · Estimated €63.00')
    expect(status()).toHaveTextContent('Added "Tram 28".')
    expect(screen.getByRole('button', { name: 'Edit Tram 28' })).toHaveFocus()
  })

  it('adds to another day and says so', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Add activity' }))
    const add = form('New activity')
    await user.type(within(add).getByLabelText('Title'), 'Fado')
    await user.selectOptions(within(add).getByLabelText('Day'), 'Day 3 · Thu, 12 Nov')
    await user.type(within(add).getByLabelText(/Start time/), '21:00')
    await user.type(within(add).getByLabelText(/Estimated cost/), '30')
    await user.click(within(add).getByRole('button', { name: 'Add activity' }))

    expect(listed()).toEqual(['Breakfast', 'Lunch'])
    expect(status()).toHaveTextContent('Added "Fado" to Day 3.')
    expect(panel()).toHaveFocus()
    expect(costRow('Day 3')).toHaveTextContent('€30.00')
  })

  it('cancels back to the Add activity button', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Add activity' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add activity' })).toHaveFocus()
  })

  it('offers adding on an empty day', async () => {
    renderTripPage(trip(), `/trips/${trip().id}?day=3`)

    expect(panel()).toHaveTextContent('No activities are planned for this day.')
    expect(within(panel()).getByRole('button', { name: 'Add activity' })).toBeInTheDocument()
  })

  it('stops offering it when the day holds 20 activities', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => activity({ title: `Stop ${i + 1}` }))
    renderTripPage(trip([twenty, [], []]))

    expect(within(panel()).queryByRole('button', { name: 'Add activity' })).not.toBeInTheDocument()
    expect(panel()).toHaveTextContent('A day can hold up to 20 activities.')
  })
})

describe('deleting an activity', () => {
  it('asks in the page, then deletes', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Delete Lunch' }))
    const question = screen.getByRole('group', { name: 'Delete "Lunch"?' })
    expect(within(question).getByRole('button', { name: 'Keep' })).toHaveFocus()

    await user.click(within(question).getByRole('button', { name: 'Delete' }))

    expect(listed()).toEqual(['Breakfast'])
    expect(status()).toHaveTextContent('Deleted "Lunch".')
    expect(panel()).toHaveTextContent('1 activity · Estimated €20.00')
    expect(budget()).toHaveTextContent('Remaining€1,420.00')
    expect(screen.getByRole('button', { name: 'Add activity' })).toHaveFocus()
  })

  it('keeps the activity with Keep or Escape', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Delete Lunch' }))
    await user.click(screen.getByRole('button', { name: 'Keep' }))
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Lunch' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Delete Lunch' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Lunch' })).toHaveFocus()
    expect(listed()).toEqual(['Breakfast', 'Lunch'])
  })

  it('shows the empty-day message after deleting the last activity', async () => {
    const user = userEvent.setup()
    renderTripPage(trip(), `/trips/${trip().id}?day=2`)

    await user.click(screen.getByRole('button', { name: 'Delete Dinner' }))
    await user.click(within(screen.getByRole('group')).getByRole('button', { name: 'Delete' }))

    expect(panel()).toHaveTextContent('No activities are planned for this day.')
    expect(screen.getByRole('button', { name: 'Add activity' })).toHaveFocus()
  })
})

describe('keeping edits', () => {
  it('closes an open form without saving when the day changes', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Edit Lunch' }))
    await fill(user, form('Edit Lunch'), 'Title', 'Brunch')
    await user.click(tab('Day 2'))
    await user.click(tab('Day 1'))

    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(listed()).toEqual(['Breakfast', 'Lunch'])
  })

  it('shows the edits again after leaving the trip page and coming back', async () => {
    const user = userEvent.setup()
    renderTripPage(trip())

    await user.click(screen.getByRole('button', { name: 'Delete Lunch' }))
    await user.click(within(screen.getByRole('group')).getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('link', { name: 'Plan another trip' }))
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Test back' }))

    expect(listed()).toEqual(['Breakfast'])
    expect(costRow('Day 1')).toHaveTextContent('€20.00')
  })
})
