import type { Trip } from '@travel-planner/shared'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { TRIPS_KEY, readTrips } from '../features/trips/tripRepository.ts'
import { renderTripPage } from '../test/renderTripPage.tsx'
import { renderWithRouter } from '../test/renderWithRouter.tsx'
import { seedTrips } from '../test/seedTrips.ts'
import { tripFixture } from '../test/tripFixture.ts'

const trip = tripFixture()
const route = `/trips/${trip.id}`
const day1 = () => screen.getByRole('tabpanel', { name: /Day 1/ })
const day1Titles = () => within(day1()).queryAllByRole('heading', { level: 3 }).map((h) => h.textContent)

async function deleteLunch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(day1()).getByRole('button', { name: 'Delete Lunch' }))
  await user.click(within(screen.getByRole('group', { name: 'Delete "Lunch"?' })).getByRole('button', { name: 'Delete' }))
}

/** Another tab saves `trips`; the browser tells this tab with a `storage` event. */
function otherTabSaves(trips: readonly Trip[]) {
  seedTrips(trips)
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: TRIPS_KEY, storageArea: localStorage }))
  })
}

function failWrites() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('/trips/:id', () => {
  it('shows "Trip not found" for a trip this browser has not saved', () => {
    renderWithRouter(<App />, { route: '/trips/unknown' })
    expect(screen.getByRole('heading', { level: 1, name: 'Trip not found' })).toBeInTheDocument()
    expect(screen.getByText(/saved only in the browser they were planned in/)).toBeInTheDocument()
    expect(document.title).toBe('Trip not found · AI Travel Planner')
  })

  it.each([
    ['My trips', 'My trips'],
    ['Plan a trip', 'Plan a trip'],
  ])('links from "Trip not found" to %s', async (link, heading) => {
    const user = userEvent.setup()
    renderWithRouter(<App />, { route: '/trips/unknown' })
    await user.click(within(screen.getByRole('main')).getByRole('link', { name: link }))
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('shows a saved trip after a reload, with its edits', async () => {
    const user = userEvent.setup()
    const { unmount } = renderTripPage(trip)
    await deleteLunch(user)
    unmount()

    renderWithRouter(<App />, { route })

    expect(screen.getByRole('heading', { level: 1, name: 'Lisbon' })).toBeInTheDocument()
    expect(day1Titles()).toEqual([])
  })

  describe('when saving fails', () => {
    it('keeps the edit, shows why it is not saved, and saves on "Try again"', async () => {
      const user = userEvent.setup()
      renderTripPage(trip)
      const setItem = failWrites()

      await deleteLunch(user)

      expect(day1Titles()).toEqual([])
      expect(screen.getByText("This trip isn't saved: browser storage is full or unavailable.")).toBeInTheDocument()
      expect(within(screen.getByRole('main')).getByRole('link', { name: 'My trips' })).toHaveAttribute('href', '/trips')

      setItem.mockRestore()
      await user.click(screen.getByRole('button', { name: 'Try again' }))

      expect(screen.queryByText(/This trip isn't saved/)).not.toBeInTheDocument()
      expect(readTrips(localStorage).trips[0].itinerary.days[0].activities).toEqual([])
    })
  })

  describe('changes from another tab', () => {
    const cheaperLunch: Trip = {
      ...trip,
      itinerary: {
        days: trip.itinerary.days.map((day, i) =>
          i === 0 ? { ...day, activities: day.activities.map((a) => ({ ...a, estimatedCost: 25 })) } : day,
        ),
      },
    }

    it('shows the new version, closes an open form and announces the update', async () => {
      const user = userEvent.setup()
      renderTripPage(trip)
      await user.click(within(day1()).getByRole('button', { name: 'Edit Lunch' }))
      expect(screen.getByRole('form', { name: 'Edit Lunch' })).toBeInTheDocument()

      otherTabSaves([cheaperLunch])

      expect(screen.queryByRole('form')).not.toBeInTheDocument()
      expect(within(day1()).getByText('€25.00')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('This trip was updated in another tab.')
    })

    it('says the trip was deleted', () => {
      renderTripPage(trip)

      otherTabSaves([])

      expect(screen.getByRole('heading', { level: 1, name: 'Trip deleted' })).toBeInTheDocument()
      expect(screen.getByText('This trip was deleted in another tab.')).toBeInTheDocument()
      const main = within(screen.getByRole('main'))
      expect(main.getByRole('link', { name: 'My trips' })).toBeInTheDocument()
      expect(main.getByRole('link', { name: 'Plan a trip' })).toBeInTheDocument()
    })
  })
})
