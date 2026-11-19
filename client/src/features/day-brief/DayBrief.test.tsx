import { activitySignature, type DayBrief, type DayBriefBlock, type Trip } from '@travel-planner/shared'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiErrorResponse, hangingFetch, jsonResponse, mockFetch, requestBody } from '../../test/fetchMock.ts'
import { renderTripPage } from '../../test/renderTripPage.tsx'
import { tripFixture, type FixtureActivity } from '../../test/tripFixture.ts'
import { TRIPS_KEY, readTrips } from '../trips/tripRepository.ts'
import { entryFor } from './registry.tsx'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const activity = (title: string, startTime: string, estimatedCost: number, category: FixtureActivity['category'] = 'other'): FixtureActivity => ({
  title,
  description: '',
  category,
  startTime,
  durationMinutes: 60,
  estimatedCost,
})

/** Day 1: Museum 09:00 €15, Park 11:00 free, Tram 15:00 €40, Dinner 20:00 €45. Day 2: Lunch. Day 3: empty. */
const baseTrip = () =>
  tripFixture({
    days: [
      [
        activity('Museum', '09:00', 15, 'culture'),
        activity('Park', '11:00', 0, 'nature'),
        activity('Tram', '15:00', 40, 'transport'),
        activity('Dinner', '20:00', 45, 'food'),
      ],
      [activity('Lunch', '13:00', 30, 'food')],
      [],
    ],
  })

const idOf = (trip: Trip, title: string) =>
  trip.itinerary.days.flatMap((day) => day.activities).find((a) => a.title === title)!.id

const PHOTO = {
  url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Museum.jpg',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Museum.jpg',
}

function blocksFor(trip: Trip): DayBriefBlock[] {
  const id = (title: string) => idOf(trip, title)
  return [
    { type: 'tip', text: 'Go to the museum early.', activityIds: [id('Museum')] },
    { type: 'highlight', title: 'Art and dinner', text: 'A calm day in town.', place: 'National Museum', activityIds: [id('Museum')], image: PHOTO },
    { type: 'route', steps: [{ fromActivityId: id('Museum'), toActivityId: id('Park'), mode: 'walk', minutes: 12, note: 'Downhill.' }] },
    { type: 'booking', text: 'Reserve a table.', activityIds: [id('Dinner')] },
    { type: 'budgetNote', text: 'Dinner is the big spend.' },
  ]
}

/** A trip whose day 1 already has an overview, up to date unless `basedOn` says otherwise. */
function tripWithBrief(overrides: Partial<DayBrief> = {}, blocks?: (trip: Trip) => DayBriefBlock[]) {
  const trip = baseTrip()
  const day = trip.itinerary.days[0]
  const brief: DayBrief = {
    blocks: (blocks ?? blocksFor)(trip),
    basedOn: activitySignature(day.activities),
    activityTitles: Object.fromEntries(day.activities.map((a) => [a.id, a.title])),
    generatedAt: '2026-11-09T10:00:00.000Z',
    ...overrides,
  }
  return { ...trip, itinerary: { days: [{ ...day, brief }, ...trip.itinerary.days.slice(1)] } }
}

const overview = () => screen.getByRole('region', { name: 'Day overview' })
const queryOverview = () => screen.queryByRole('region', { name: 'Day overview' })
const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}\\b`) })
const createButton = () => within(overview()).getByRole('button', { name: 'Create day overview' })
const stored = () => readTrips(localStorage).trips[0]

/** A fetch whose answers the test hands out one by one. */
function deferredFetch() {
  const pending: { resolve: (response: Response) => void; signal?: AbortSignal | null }[] = []
  const fetchMock = mockFetch(
    (_input, init) =>
      new Promise<Response>((resolve, reject) => {
        pending.push({ resolve, signal: init?.signal })
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      }),
  )
  return { fetchMock, pending }
}

const success = (trip: Trip) => jsonResponse(200, { data: { brief: { blocks: blocksFor(trip), generatedAt: '2026-11-09T12:30:00.000Z' } } })

describe('creating a day overview', () => {
  it('offers the button on a day with activities and sends nothing until it is used', () => {
    const fetchMock = mockFetch(hangingFetch)
    renderTripPage(baseTrip())
    expect(createButton()).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows no overview section on a day without activities', async () => {
    const user = userEvent.setup()
    renderTripPage(baseTrip())
    await user.click(tab('Day 3'))
    expect(queryOverview()).not.toBeInTheDocument()
  })

  it('comes after the day heading and before the activity list', () => {
    renderTripPage(baseTrip())
    const list = within(screen.getByRole('tabpanel')).getByRole('list', { name: 'Activities' })
    expect(overview().compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows a skeleton while loading, then the overview, and saves it with the trip', async () => {
    const user = userEvent.setup()
    const trip = baseTrip()
    const { fetchMock, pending } = deferredFetch()
    renderTripPage(trip)

    await user.click(createButton())
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/days/brief')
    expect(requestBody(fetchMock).activities.map((a: { title: string }) => a.title)).toEqual(['Museum', 'Park', 'Tram', 'Dinner'])

    expect(within(overview()).getByRole('button', { name: 'Creating overview…' })).toBeDisabled()
    expect(screen.getByTestId('day-brief-skeleton')).toBeInTheDocument()
    expect(within(overview()).getByText('Creating the day overview')).toBeInTheDocument()

    pending[0].resolve(success(trip))
    expect(await within(overview()).findByRole('heading', { name: 'Art and dinner' })).toBeInTheDocument()
    expect(screen.queryByTestId('day-brief-skeleton')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Day overview created.')

    const saved = stored().itinerary.days[0].brief!
    expect(saved.basedOn).toBe(activitySignature(trip.itinerary.days[0].activities))
    expect(saved.activityTitles?.[idOf(trip, 'Dinner')]).toBe('Dinner')
    expect(saved.blocks).toHaveLength(5)
  })

  it('shows the saved overview after a reload without a new request', async () => {
    const user = userEvent.setup()
    const trip = baseTrip()
    mockFetch(async () => success(trip))
    renderTripPage(trip)
    await user.click(createButton())
    await within(overview()).findByRole('heading', { name: 'Art and dinner' })

    const saved = stored()
    cleanup()
    const fetchMock = mockFetch(hangingFetch)
    renderTripPage(saved)
    expect(within(overview()).getByRole('heading', { name: 'Art and dinner' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('opens an older saved trip without overviews normally', () => {
    localStorage.setItem(TRIPS_KEY, JSON.stringify({ version: 1, trips: [baseTrip()] }))
    renderTripPage(baseTrip())
    expect(createButton()).toBeInTheDocument()
  })

  it('cancels the request and saves nothing when the user switches days', async () => {
    const user = userEvent.setup()
    const { pending } = deferredFetch()
    renderTripPage(baseTrip())
    await user.click(createButton())
    await user.click(tab('Day 2'))

    expect(pending[0].signal?.aborted).toBe(true)
    expect(stored().itinerary.days[0].brief).toBeUndefined()
  })
})

describe('overview errors', () => {
  it('shows the busy message and retries with a new request', async () => {
    const user = userEvent.setup()
    const trip = baseTrip()
    const fetchMock = mockFetch(async () => apiErrorResponse('AI_UNAVAILABLE'))
    renderTripPage(trip)
    await user.click(createButton())

    const alert = await within(overview()).findByRole('alert')
    expect(alert).toHaveTextContent('Day overviews are busy or unavailable right now.')
    expect(alert).not.toHaveTextContent('itinerary')

    fetchMock.mockImplementation(async () => success(trip))
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(await within(overview()).findByRole('heading', { name: 'Art and dinner' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('counts down Retry-After before allowing another try', async () => {
    const user = userEvent.setup()
    mockFetch(async () => apiErrorResponse('RATE_LIMITED', { 'Retry-After': '30' }))
    renderTripPage(baseTrip())
    await user.click(createButton())

    const alert = await within(overview()).findByRole('alert')
    expect(alert).toHaveTextContent('You can try again in 30 seconds.')
    expect(within(alert).getByRole('button', { name: /Try again in \d+ s/ })).toBeDisabled()
  })
})

describe('overview layout', () => {
  it('shows the blocks in a fixed order with their headings, whatever order they were saved in', () => {
    renderTripPage(tripWithBrief())
    const headings = within(overview()).getAllByRole('heading', { level: 4 }).map((h) => h.textContent)
    expect(headings).toEqual(['Art and dinner', 'Route', 'Tip', 'Book ahead', 'Day budget'])
    expect(within(overview()).getByText(/Created 9 Nov 2026/)).toBeInTheDocument()
  })

  it('skips block types it does not know', () => {
    expect(entryFor({ type: 'map' })).toBeUndefined()
    expect(entryFor({ type: 'toString' })).toBeUndefined()
    expect(entryFor({ type: 'tip' })).toBeDefined()
  })

  it('shows the photo with its credit, and the tinted panel when it fails to load', () => {
    renderTripPage(tripWithBrief())
    const image = within(overview()).getByRole('img', { name: 'Photo of National Museum' })
    expect(image).toHaveAttribute('src', PHOTO.url)
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(within(overview()).getByRole('link', { name: 'Photo: Wikimedia Commons' })).toHaveAttribute('href', PHOTO.sourceUrl)

    fireEvent.error(image)
    expect(within(overview()).queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('highlight-fallback')).toBeInTheDocument()
  })

  it('shows the tinted panel when there is no photo', () => {
    const noPhoto = (trip: Trip) =>
      blocksFor(trip).map((block) => (block.type === 'highlight' ? { ...block, image: undefined } : block))
    renderTripPage(tripWithBrief({}, noPhoto))
    expect(screen.getByTestId('highlight-fallback')).toBeInTheDocument()
  })

  it('reads each route step with times, mode, minutes and note', () => {
    renderTripPage(tripWithBrief())
    const route = within(overview()).getByRole('heading', { name: 'Route' }).parentElement!
    const step = within(route).getByRole('listitem')
    expect(step).toHaveTextContent('09:00 Museum→11:00 Park')
    expect(step).toHaveTextContent('Walk · 12 min')
    expect(step).toHaveTextContent('Downhill.')
  })

  it('computes the day budget from the activities, most expensive first', () => {
    renderTripPage(tripWithBrief())
    const rows = within(within(overview()).getByRole('table')).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.textContent)).toEqual(['Dinner€45.0045%', 'Tram€40.0040%', 'Museum€15.0015%', 'Free: 1 activity'])
    expect(within(overview()).getByText('Dinner is the big spend.')).toBeInTheDocument()
  })

  it('updates the budget after an edit without a new request', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch(hangingFetch)
    renderTripPage(tripWithBrief())

    await user.click(screen.getByRole('button', { name: 'Edit Dinner' }))
    const edit = screen.getByRole('form', { name: 'Edit Dinner' })
    const cost = within(edit).getByLabelText(/Estimated cost/)
    await user.clear(cost)
    await user.type(cost, '60')
    await user.click(within(edit).getByRole('button', { name: 'Save activity' }))

    expect(within(within(overview()).getByRole('table')).getAllByRole('row')[1]).toHaveTextContent('Dinner€60.00')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('links to activities', () => {
  it('focuses and highlights the activity, then clears the highlight', () => {
    const trip = tripWithBrief()
    renderTripPage(trip)

    const booking = within(overview()).getByRole('heading', { name: 'Book ahead' }).parentElement!
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    // fireEvent, not user-event: user-event waits on timers, which are fake here.
    fireEvent.click(within(booking).getByRole('button', { name: 'Dinner' }))

    const item = document.getElementById(`activity-${idOf(trip, 'Dinner')}`)!
    expect(item).toHaveFocus()
    expect(item).toHaveAttribute('data-flash')
    vi.advanceTimersByTime(2000)
    expect(item).not.toHaveAttribute('data-flash')
  })

  it('names an activity deleted since as plain text', async () => {
    const user = userEvent.setup()
    renderTripPage(tripWithBrief())

    await user.click(screen.getByRole('button', { name: 'Delete Dinner' }))
    await user.click(within(screen.getByRole('group', { name: 'Delete "Dinner"?' })).getByRole('button', { name: 'Delete' }))

    const booking = within(overview()).getByRole('heading', { name: 'Book ahead' }).parentElement!
    expect(within(booking).queryByRole('button', { name: 'Dinner' })).not.toBeInTheDocument()
    expect(booking).toHaveTextContent('Dinner')
  })
})

describe('stale overview', () => {
  it('offers an update but no notice while the overview is current', () => {
    renderTripPage(tripWithBrief())
    expect(within(overview()).getByRole('button', { name: 'Update overview' })).toBeInTheDocument()
    expect(within(overview()).queryByText(/plan for this day changed/)).not.toBeInTheDocument()
  })

  it('keeps the overview and shows the notice after an edit, without a request', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch(hangingFetch)
    renderTripPage(tripWithBrief())

    await user.click(screen.getByRole('button', { name: 'Delete Park' }))
    await user.click(within(screen.getByRole('group', { name: 'Delete "Park"?' })).getByRole('button', { name: 'Delete' }))

    expect(within(overview()).getByText('The plan for this day changed since this overview was created.')).toBeInTheDocument()
    expect(within(overview()).getByRole('heading', { name: 'Art and dinner' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('marks an overview stale when the day was edited while it was being created', async () => {
    const user = userEvent.setup()
    const trip = baseTrip()
    const { pending } = deferredFetch()
    renderTripPage(trip)

    await user.click(createButton())
    await user.click(screen.getByRole('button', { name: 'Delete Park' }))
    await user.click(within(screen.getByRole('group', { name: 'Delete "Park"?' })).getByRole('button', { name: 'Delete' }))
    pending[0].resolve(success(trip))

    expect(await within(overview()).findByRole('heading', { name: 'Art and dinner' })).toBeInTheDocument()
    expect(within(overview()).getByText(/plan for this day changed/)).toBeInTheDocument()
  })

  it('replaces the overview on update and clears the notice', async () => {
    const user = userEvent.setup()
    const trip = tripWithBrief({ basedOn: 'outdated' }, (t) => [{ type: 'tip', text: 'Old tip.', activityIds: [idOf(t, 'Museum')] }])
    mockFetch(async () => success(trip))
    renderTripPage(trip)

    await user.click(within(overview()).getByRole('button', { name: 'Update overview' }))
    expect(await within(overview()).findByRole('heading', { name: 'Art and dinner' })).toBeInTheDocument()
    expect(within(overview()).queryByText('Old tip.')).not.toBeInTheDocument()
    expect(within(overview()).queryByText(/plan for this day changed/)).not.toBeInTheDocument()
  })

  it('keeps the old overview when an update fails', async () => {
    const user = userEvent.setup()
    const trip = tripWithBrief({ basedOn: 'outdated' }, (t) => [{ type: 'tip', text: 'Old tip.', activityIds: [idOf(t, 'Museum')] }])
    mockFetch(async () => apiErrorResponse('AI_TIMEOUT'))
    renderTripPage(trip)

    await user.click(within(overview()).getByRole('button', { name: 'Update overview' }))
    expect(await within(overview()).findByRole('alert')).toHaveTextContent("The day overview couldn't be created.")
    expect(within(overview()).getByText('Old tip.')).toBeInTheDocument()
  })
})
