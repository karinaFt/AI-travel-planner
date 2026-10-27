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

function headerLink(name: string) {
  return within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name })
}

function listedInterests() {
  const list = screen.queryByRole('list', { name: 'Your interests' })
  return list ? within(list).getAllByRole('listitem').map((item) => item.textContent) : []
}

describe('Draft retention', () => {
  it('keeps unsubmitted values when leaving and returning to /plan', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, {
      destination: 'Kyoto',
      budget: '2400',
      travelStyle: 'culture',
      interests: ['temples', 'tea'],
    })

    await user.click(headerLink('Home'))
    expect(screen.getByRole('heading', { level: 1, name: 'Plan your next trip with AI' })).toBeInTheDocument()
    await user.click(headerLink('Plan a trip'))

    expect(tripFields.destination()).toHaveValue('Kyoto')
    expect(tripFields.budget()).toHaveValue('2400')
    expect(screen.getByRole('radio', { name: 'Culture' })).toBeChecked()
    expect(listedInterests()).toEqual(['temples', 'tea'])
  })

  it('shows the form with the reviewed values after leaving the review', async () => {
    const user = renderPlanPage()
    await fillPreferences(user, { ...validPreferences, origin: 'Kyiv', pace: 'packed' })
    await user.click(tripFields.submit())
    expect(screen.queryByRole('button', { name: 'Review trip' })).not.toBeInTheDocument()

    await user.click(headerLink('Home'))
    await user.click(headerLink('Plan a trip'))

    expect(tripFields.submit()).toBeInTheDocument()
    expect(tripFields.destination()).toHaveValue('Lisbon')
    expect(tripFields.origin()).toHaveValue('Kyiv')
    expect(tripFields.startDate()).toHaveValue('2026-11-10')
    expect(screen.getByRole('radio', { name: 'Food' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Packed' })).toBeChecked()
  })

  it('starts empty in a fresh app', () => {
    renderPlanPage()

    expect(tripFields.destination()).toHaveValue('')
  })
})
