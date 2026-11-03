import type { Trip } from '@travel-planner/shared'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { TRIPS_KEY, readTrips } from '../features/trips/tripRepository.ts'
import { renderWithRouter } from '../test/renderWithRouter.tsx'
import { seedTrips } from '../test/seedTrips.ts'
import { tripFixture } from '../test/tripFixture.ts'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function trip(n: number, destination: string): Trip {
  const base = tripFixture({ id: uuid(n) })
  return {
    ...base,
    createdAt: `2026-10-0${n}T10:00:00.000Z`,
    preferences: { ...base.preferences, destination },
  }
}

const porto = trip(1, 'Porto')
const lisbon = trip(2, 'Lisbon')
const madrid = trip(3, 'Madrid')

function renderTrips() {
  const user = userEvent.setup()
  renderWithRouter(<App />, { route: '/trips' })
  return user
}

const items = () => within(screen.getByRole('list', { name: 'Saved trips' })).getAllByRole('listitem')
const tripLink = (destination: string) => screen.getByRole('link', { name: destination })
const deleteButton = (destination: string) => screen.getByRole('button', { name: new RegExp(`^Delete ${destination} trip`) })
const status = () => within(screen.getByRole('main')).getByRole('status')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('/trips', () => {
  it('lists saved trips newest first with their facts', () => {
    seedTrips([porto, lisbon])
    renderTrips()

    expect(screen.getByRole('heading', { level: 1, name: 'My trips' })).toBeInTheDocument()
    expect(items().map((item) => within(item).getByRole('heading').textContent)).toEqual(['Lisbon', 'Porto'])
    const first = items()[0]
    expect(first).toHaveTextContent('10 Nov 2026 – 12 Nov 2026 · 3 days')
    expect(first).toHaveTextContent('2 travelers · Budget €1,500.00')
    expect(deleteButton('Lisbon')).toHaveAccessibleName('Delete Lisbon trip, 10 Nov 2026 – 12 Nov 2026')
  })

  it('opens a trip from the list', async () => {
    seedTrips([lisbon])
    const user = renderTrips()

    await user.click(tripLink('Lisbon'))

    expect(screen.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeInTheDocument()
  })

  it('shows an empty state that links to the plan page', () => {
    renderTrips()

    expect(screen.getByText(/No saved trips yet/)).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Plan a trip' })).toHaveAttribute('href', '/plan')
  })

  describe('deleting', () => {
    it('asks in the page, then deletes, announces and focuses the next trip', async () => {
      seedTrips([porto, lisbon, madrid])
      const user = renderTrips()

      await user.click(deleteButton('Lisbon'))
      const confirmation = screen.getByRole('group', { name: 'Delete "Lisbon"?' })
      expect(within(confirmation).getByRole('button', { name: 'Keep' })).toHaveFocus()
      await user.click(within(confirmation).getByRole('button', { name: 'Delete' }))

      expect(screen.queryByRole('link', { name: 'Lisbon' })).not.toBeInTheDocument()
      expect(readTrips(localStorage).trips.map((t) => t.preferences.destination)).toEqual(['Porto', 'Madrid'])
      expect(status()).toHaveTextContent('Deleted "Lisbon".')
      expect(tripLink('Porto')).toHaveFocus()
    })

    it('focuses the previous trip after deleting the last one in the list', async () => {
      seedTrips([porto, lisbon])
      const user = renderTrips()

      await user.click(deleteButton('Porto'))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(tripLink('Lisbon')).toHaveFocus()
    })

    it('focuses "Plan a trip" after deleting the only trip', async () => {
      seedTrips([lisbon])
      const user = renderTrips()

      await user.click(deleteButton('Lisbon'))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(within(screen.getByRole('main')).getByRole('link', { name: 'Plan a trip' })).toHaveFocus()
    })

    it.each([
      ['Keep', async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Keep' }))],
      ['Escape', async (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}')],
    ])('keeps the trip with %s and returns focus to Delete', async (_, keep) => {
      seedTrips([lisbon])
      const user = renderTrips()

      await user.click(deleteButton('Lisbon'))
      await keep(user)

      expect(screen.queryByRole('group')).not.toBeInTheDocument()
      expect(tripLink('Lisbon')).toBeInTheDocument()
      expect(deleteButton('Lisbon')).toHaveFocus()
    })

    it('keeps the trip and says so when storage refuses the delete', async () => {
      seedTrips([lisbon])
      const user = renderTrips()
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Full', 'QuotaExceededError')
      })

      await user.click(deleteButton('Lisbon'))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(tripLink('Lisbon')).toBeInTheDocument()
      expect(status()).toHaveTextContent(`Couldn't delete "Lisbon". Try again.`)
      expect(deleteButton('Lisbon')).toHaveFocus()
    })
  })

  describe('notices', () => {
    it('says how many saved trips could not be read', () => {
      localStorage.setItem(TRIPS_KEY, JSON.stringify({ version: 1, trips: [porto, lisbon, { id: 'broken' }] }))
      renderTrips()

      expect(items()).toHaveLength(2)
      expect(screen.getByText("1 saved trip couldn't be read and was set aside.")).toBeInTheDocument()
    })

    it('shows the empty state and a notice for a broken value', () => {
      localStorage.setItem(TRIPS_KEY, '{not json')
      renderTrips()

      expect(screen.getByText(/No saved trips yet/)).toBeInTheDocument()
      expect(screen.getByText("Your saved trips couldn't be read and were set aside.")).toBeInTheDocument()
    })

    it('says when the browser does not allow saving', () => {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
        throw new DOMException('Blocked', 'SecurityError')
      })
      renderTrips()

      expect(screen.getByText(/isn't letting the app save trips/)).toBeInTheDocument()
    })
  })

  it('lists a trip another tab saved', () => {
    seedTrips([porto])
    renderTrips()

    seedTrips([porto, lisbon])
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: TRIPS_KEY, storageArea: localStorage }))
    })

    expect(items().map((item) => within(item).getByRole('heading').textContent)).toEqual(['Lisbon', 'Porto'])
  })
})
