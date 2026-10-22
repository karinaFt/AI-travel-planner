import { screen } from '@testing-library/react'
import { MESSAGES } from '@travel-planner/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fillBasics, renderPlanPage, tripFields, validBasics } from './testUtils.tsx'

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

describe('Trip basics form', () => {
  it('shows every field with its label and a Continue button', () => {
    renderPlanPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Plan a trip' })).toBeInTheDocument()
    for (const field of Object.values(tripFields)) {
      expect(field()).toBeInTheDocument()
    }
  })

  it('presets currency and travelers and leaves the rest empty', () => {
    renderPlanPage()

    expect(tripFields.currency()).toHaveValue('EUR')
    expect(tripFields.travelers()).toHaveValue('1')
    expect(tripFields.destination()).toHaveValue('')
    expect(tripFields.startDate()).toHaveValue('')
    expect(tripFields.endDate()).toHaveValue('')
    expect(tripFields.budget()).toHaveValue('')
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
    await fillBasics(user, { ...validBasics, destination: '', budget: 'abc' })

    await user.click(tripFields.submit())

    expect(tripFields.destination()).toHaveAccessibleDescription(MESSAGES.destinationRequired)
    expect(tripFields.budget()).toHaveAccessibleDescription(
      expect.stringContaining(MESSAGES.budgetFormat),
    )
    expect(tripFields.destination()).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'Your trip so far' })).not.toBeInTheDocument()
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
