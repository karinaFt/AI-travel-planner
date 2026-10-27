import { fireEvent, screen } from '@testing-library/react'
import { MESSAGES } from '@travel-planner/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { START_IN_PAST_MESSAGE } from './formSchema.ts'
import { fillPreferences, renderPlanPage, tripFields, validPreferences } from './testUtils.tsx'

const SUMMARY_HEADING = 'Review your trip'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-21T10:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

async function submitWith(overrides: Partial<typeof validPreferences>) {
  const user = renderPlanPage()
  await fillPreferences(user, { ...validPreferences, ...overrides })
  await user.click(tripFields.submit())
  return user
}

function expectError(field: HTMLElement, message: string) {
  expect(field).toHaveAttribute('aria-invalid', 'true')
  expect(field).toHaveAccessibleDescription(expect.stringContaining(message))
}

function expectNotSubmitted() {
  expect(screen.queryByRole('heading', { name: SUMMARY_HEADING })).not.toBeInTheDocument()
}

describe('Trip basics fields', () => {
  it('rejects an end date before the start date', async () => {
    await submitWith({ startDate: '2026-11-10', endDate: '2026-11-08' })

    expectError(tripFields.endDate(), MESSAGES.endBeforeStart)
    expectNotSubmitted()
  })

  it('re-checks the end date when the start date changes', async () => {
    const user = await submitWith({ startDate: '2026-11-10', endDate: '2026-11-08' })
    expectError(tripFields.endDate(), MESSAGES.endBeforeStart)

    await fillPreferences(user, { startDate: '2026-11-05' })

    expect(tripFields.endDate()).not.toHaveAttribute('aria-invalid')
  })

  it('allows 14 days, rejects 15 and clears the error when fixed', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, { ...validPreferences, startDate: '2026-11-01', endDate: '2026-11-15' })
    await user.click(tripFields.submit())
    expectError(tripFields.endDate(), MESSAGES.tripTooLong)

    await fillPreferences(user, { endDate: '2026-11-14' })

    expect(tripFields.endDate()).not.toHaveAttribute('aria-invalid')
  })

  it('rejects a start date in the past', async () => {
    await submitWith({ startDate: '2026-10-20', endDate: '2026-10-22' })

    expectError(tripFields.startDate(), START_IN_PAST_MESSAGE)
    expectNotSubmitted()
  })

  it('asks for a valid date when a date is missing', async () => {
    await submitWith({ endDate: '' })

    expectError(tripFields.endDate(), MESSAGES.invalidDate)
  })

  it.each([
    ['0', MESSAGES.budgetPositive],
    ['-200', MESSAGES.budgetPositive],
    ['abc', MESSAGES.budgetFormat],
    ['12,5,0', MESSAGES.budgetFormat],
    ['1e5', MESSAGES.budgetFormat],
    ['Infinity', MESSAGES.budgetFormat],
    ['100.555', MESSAGES.budgetDecimals],
    ['20000000', MESSAGES.budgetMax],
  ])('shows the right budget message for %j', async (budget, message) => {
    await submitWith({ budget })

    expectError(tripFields.budget(), message)
    expectNotSubmitted()
  })

  it.each(['0', '21', '2.5', 'two'])('rejects %j travelers', async (travelers) => {
    await submitWith({ travelers })

    expectError(tripFields.travelers(), MESSAGES.travelers)
  })

  it('rejects a currency value that is not in the list', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, validPreferences)
    const select = tripFields.currency() as HTMLSelectElement
    // Simulate a value changed through developer tools.
    select.add(new Option('XYZ', 'XYZ'))
    fireEvent.change(select, { target: { value: 'XYZ' } })

    await user.click(tripFields.submit())

    expectError(select, MESSAGES.currency)
    expectNotSubmitted()
  })

  it('handles pasted junk without crashing', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, { ...validPreferences, budget: '' })
    await user.click(tripFields.budget())
    await user.paste('1e400')

    await user.click(tripFields.submit())

    expectError(tripFields.budget(), MESSAGES.budgetFormat)
    expect(tripFields.destination()).toHaveValue('Lisbon')
  })

  it('handles a very long destination', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, { ...validPreferences, destination: '' })
    await user.click(tripFields.destination())
    await user.paste('x'.repeat(5000))
    await user.click(tripFields.submit())

    expectError(tripFields.destination(), MESSAGES.destinationLength)
  })
})
