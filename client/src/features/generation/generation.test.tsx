import { ERROR_CODES } from '@travel-planner/shared'
import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App.tsx'
import { apiErrorResponse, hangingFetch, jsonResponse, mockFetch, requestBody } from '../../test/fetchMock.ts'
import { renderWithRouter } from '../../test/renderWithRouter.tsx'
import { tripFixture } from '../../test/tripFixture.ts'
import { fillPreferences, tripFields, validPreferences } from '../trip-setup/testUtils.tsx'
import { NETWORK_MESSAGE, VALIDATION_MESSAGE } from './messages.ts'

// The form rejects past dates, so "today" is fixed before the trip.
const TODAY = new Date('2026-10-21T10:00:00')

const reviewed = {
  destination: 'Lisbon',
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  budget: 1500,
  currency: 'EUR',
  travelers: 2,
  travelStyle: 'food',
  pace: 'balanced',
  interests: [],
}

const generateButton = () => screen.queryByRole('button', { name: 'Generate itinerary' })

function reviewValue(label: string) {
  return screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent
}

/** Renders /plan and submits the valid preferences, ending on the review. */
async function reachReview(user: ReturnType<typeof userEvent.setup>) {
  renderWithRouter(<App />, { route: '/plan' })
  await fillPreferences(user, validPreferences)
  await user.click(tripFields.submit())
  expect(screen.getByRole('heading', { name: 'Review your trip' })).toBeInTheDocument()
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('generating from the review', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
  })

  it('sends the reviewed preferences, shows the loading state and lets the user cancel', async () => {
    const fetchMock = mockFetch(hangingFetch)
    const user = userEvent.setup()
    await reachReview(user)

    await user.click(generateButton()!)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/itineraries/generate')
    expect(requestBody(fetchMock)).toEqual(reviewed)

    expect(screen.getByRole('status')).toHaveTextContent('Generating your itinerary…')
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(cancel).toHaveFocus()
    expect(generateButton()).not.toBeInTheDocument()

    await user.click(cancel)
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    expect(screen.getByRole('status')).toHaveTextContent('Generation cancelled.')
    expect(generateButton()).toHaveFocus()
    expect(reviewValue('Destination')).toBe('Lisbon')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a busy service error with Try again and Edit details, keeping every value', async () => {
    mockFetch(async () => apiErrorResponse('AI_UNAVAILABLE'))
    const user = userEvent.setup()
    await reachReview(user)

    await user.click(generateButton()!)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(ERROR_CODES.AI_UNAVAILABLE.message)
    expect(within(alert).getByRole('heading', { name: "We couldn't generate your itinerary" })).toHaveFocus()
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeEnabled()
    expect(reviewValue('Budget')).toBe('€1,500.00')

    await user.click(within(alert).getByRole('button', { name: 'Edit details' }))
    expect(tripFields.destination()).toHaveValue('Lisbon')
    expect(tripFields.budget()).toHaveValue('1500')
    expect(tripFields.startDate()).toHaveValue('2026-11-10')
  })

  it.each([
    ['the server is unreachable', async () => Promise.reject(new TypeError('Failed to fetch')), NETWORK_MESSAGE],
    [
      'the success body is malformed',
      async () => jsonResponse(200, { data: {} }),
      ERROR_CODES.AI_INVALID_RESPONSE.message,
    ],
    [
      'the error body is unreadable',
      async () => new Response('oops', { status: 500 }),
      ERROR_CODES.INTERNAL_ERROR.message,
    ],
  ])('explains when %s', async (_, respond, message) => {
    mockFetch(respond)
    const user = userEvent.setup()
    await reachReview(user)
    await user.click(generateButton()!)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(message)
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('offers only Edit details when the API rejects the preferences', async () => {
    mockFetch(async () => apiErrorResponse('VALIDATION_ERROR'))
    const user = userEvent.setup()
    await reachReview(user)
    await user.click(generateButton()!)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(VALIDATION_MESSAGE)
    expect(within(alert).queryByRole('button', { name: /Try again/ })).not.toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'Edit details' })).toBeInTheDocument()
  })

  it('retries with the same preferences and opens the trip page on success', async () => {
    const trip = tripFixture({ preferences: reviewed as never })
    const fetchMock = mockFetch(async () => apiErrorResponse('AI_INVALID_RESPONSE'))
    const user = userEvent.setup()
    await reachReview(user)
    await user.click(generateButton()!)
    const alert = await screen.findByRole('alert')

    fetchMock.mockImplementation(async () => jsonResponse(200, { data: { trip } }))
    await user.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(requestBody(fetchMock, 1)).toEqual(requestBody(fetchMock, 0))

    expect(await screen.findByRole('heading', { level: 1, name: 'Lisbon' })).toBeInTheDocument()
    expect(screen.getByText(/10 Nov 2026 – 12 Nov 2026 · 3 days/)).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Day 1 Tue, 10 Nov',
      'Day 2 Wed, 11 Nov',
      'Day 3 Thu, 12 Nov',
    ])
    const panel = screen.getByRole('tabpanel', { name: /Day 1/ })
    expect(panel).toHaveTextContent('Day title 1')
    expect(within(panel).getByRole('heading', { level: 3, name: 'Lunch' })).toBeInTheDocument()
    expect(document.title).toBe('Lisbon trip · AI Travel Planner')

    // The form still holds the generated trip's values.
    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'Plan another trip' }))
    expect(tripFields.destination()).toHaveValue('Lisbon')
    expect(tripFields.budget()).toHaveValue('1500')
  })

  it('aborts the request without an error when the user leaves the page', async () => {
    const consoleError = vi.spyOn(console, 'error')
    const fetchMock = mockFetch(hangingFetch)
    const user = userEvent.setup()
    await reachReview(user)
    await user.click(generateButton()!)

    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    await act(async () => {})
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalled()
  })
})

describe('waiting on timers', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
  })

  /**
   * Reaches the review with real timers, then fakes them all and starts generating. Clicks use the
   * synchronous fireEvent from here on: user-event's async wrapper waits on a timer that fake time never fires.
   */
  async function generateWithFakeTimers() {
    await reachReview(userEvent.setup())
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(TODAY)
    fireEvent.click(generateButton()!)
  }

  const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

  it('keeps Try again disabled until Retry-After has passed', async () => {
    mockFetch(async () => apiErrorResponse('RATE_LIMITED', { 'Retry-After': '40' }))
    await generateWithFakeTimers()
    await advance(0)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Too many requests. You can try again in 40 seconds.')
    expect(within(alert).getByRole('button', { name: 'Try again in 40 s' })).toBeDisabled()

    await advance(39_000)
    expect(within(alert).getByRole('button', { name: 'Try again in 1 s' })).toBeDisabled()
    await advance(1_000)
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeEnabled()
  })

  it('gives up after 45 seconds with a timeout message', async () => {
    const fetchMock = mockFetch(hangingFetch)
    await generateWithFakeTimers()

    await advance(44_999)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await advance(1)
    expect(screen.getByRole('alert')).toHaveTextContent(ERROR_CODES.AI_TIMEOUT.message)
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
  })
})
