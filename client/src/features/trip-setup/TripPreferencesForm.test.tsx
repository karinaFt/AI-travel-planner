import { fireEvent, screen, within } from '@testing-library/react'
import { MESSAGES, PREFERENCE_MESSAGES } from '@travel-planner/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fillPreferences, renderPlanPage, tripFields, validPreferences } from './testUtils.tsx'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-21T10:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

function errorTexts() {
  return screen.queryAllByText((_, element) => element?.id.endsWith('-error') ?? false)
}

describe('Trip preferences form', () => {
  it('shows every field with its label and a Review trip button', () => {
    renderPlanPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Plan a trip' })).toBeInTheDocument()
    for (const field of Object.values(tripFields)) {
      expect(field()).toBeInTheDocument()
    }
    expect(within(tripFields.travelStyle()).getAllByRole('radio')).toHaveLength(5)
    expect(within(tripFields.pace()).getAllByRole('radio')).toHaveLength(3)
  })

  it('presets currency, travelers and pace and leaves the rest empty', () => {
    renderPlanPage()

    expect(tripFields.currency()).toHaveValue('EUR')
    expect(tripFields.travelers()).toHaveValue('1')
    expect(screen.getByRole('radio', { name: 'Balanced' })).toBeChecked()
    for (const radio of within(tripFields.travelStyle()).getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
    }
    expect(screen.queryByRole('list', { name: 'Your interests' })).not.toBeInTheDocument()
    expect(tripFields.destination()).toHaveValue('')
    expect(tripFields.origin()).toHaveValue('')
    expect(tripFields.startDate()).toHaveValue('')
    expect(tripFields.endDate()).toHaveValue('')
    expect(tripFields.budget()).toHaveValue('')
  })

  it('explains the starting point and the budget scope', () => {
    renderPlanPage()

    expect(tripFields.origin()).toHaveAccessibleDescription(
      expect.stringContaining('Used to plan arrival and departure days'),
    )
    expect(tripFields.budget()).toHaveAccessibleDescription(
      expect.stringContaining("getting there and back isn't included"),
    )
  })

  it('offers each currency with its code and name', () => {
    renderPlanPage()

    expect(screen.getByRole('option', { name: 'UAH — Ukrainian hryvnia' })).toHaveValue('UAH')
    expect(screen.getAllByRole('option')).toHaveLength(10)
  })

  it('shows no errors before the user interacts', () => {
    renderPlanPage()

    expect(errorTexts()).toHaveLength(0)
    expect(tripFields.destination()).not.toHaveAttribute('aria-invalid')
  })

  it('shows an error when the user leaves an empty required field', async () => {
    const user = renderPlanPage()

    await user.click(tripFields.destination())
    await user.tab()

    expect(tripFields.destination()).toHaveAttribute('aria-invalid', 'true')
    expect(tripFields.destination()).toHaveAccessibleDescription(MESSAGES.destinationRequired)
  })

  it('shows all errors on submit and focuses the first invalid field', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, { ...validPreferences, destination: '', budget: 'abc' })

    await user.click(tripFields.submit())

    expect(tripFields.destination()).toHaveAccessibleDescription(MESSAGES.destinationRequired)
    expect(tripFields.budget()).toHaveAccessibleDescription(
      expect.stringContaining(MESSAGES.budgetFormat),
    )
    expect(tripFields.destination()).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'Review your trip' })).not.toBeInTheDocument()
  })

  it('removes an error as soon as the value becomes valid', async () => {
    const user = renderPlanPage()
    await user.click(tripFields.submit())
    expect(tripFields.destination()).toHaveAttribute('aria-invalid', 'true')

    await user.type(tripFields.destination(), 'Rome')

    expect(tripFields.destination()).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByText(MESSAGES.destinationRequired)).not.toBeInTheDocument()
  })
})

/** The form is replaced by the review after a successful submit. */
function wasSubmitted() {
  return screen.queryByRole('button', { name: 'Review trip' }) === null
}

describe('Starting point', () => {
  it('is optional', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, validPreferences)

    await user.click(tripFields.submit())

    expect(wasSubmitted()).toBe(true)
  })

  it('rejects a one-letter starting point', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, { ...validPreferences, origin: 'K' })

    await user.click(tripFields.submit())

    expect(tripFields.origin()).toHaveAttribute('aria-invalid', 'true')
    expect(tripFields.origin()).toHaveAccessibleDescription(
      expect.stringContaining(PREFERENCE_MESSAGES.originLength),
    )
    expect(wasSubmitted()).toBe(false)
  })
})

describe('Travel style', () => {
  it('is required', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, { ...validPreferences, travelStyle: undefined })

    await user.click(tripFields.submit())

    expect(tripFields.travelStyle()).toHaveAccessibleDescription(PREFERENCE_MESSAGES.travelStyle)
    expect(wasSubmitted()).toBe(false)
  })

  it('can be chosen with the arrow keys', async () => {
    const user = renderPlanPage()
    await user.click(screen.getByRole('radio', { name: 'Relaxation' }))

    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('radio', { name: 'Adventure' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Adventure' })).toHaveAccessibleDescription(
      'Hikes, sports, adrenaline',
    )
  })
})

describe('Pace', () => {
  it('can be changed', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, { ...validPreferences, pace: 'packed' })

    expect(screen.getByRole('radio', { name: 'Packed' })).toBeChecked()
    await user.click(tripFields.submit())
    expect(wasSubmitted()).toBe(true)
  })

  it('rejects a tampered value', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, validPreferences)
    // Simulate a value changed through developer tools.
    const packed = screen.getByRole('radio', { name: 'Packed' }) as HTMLInputElement
    packed.value = 'slow'
    fireEvent.click(packed)

    await user.click(tripFields.submit())

    expect(tripFields.pace()).toHaveAccessibleDescription(PREFERENCE_MESSAGES.pace)
    expect(wasSubmitted()).toBe(false)
  })
})
