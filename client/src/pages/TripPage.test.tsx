import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App.tsx'
import { renderWithRouter } from '../test/renderWithRouter.tsx'

describe('/trips/:id', () => {
  it('shows "Trip not found" for a trip this tab does not hold', () => {
    renderWithRouter(<App />, { route: '/trips/unknown' })
    expect(screen.getByRole('heading', { level: 1, name: 'Trip not found' })).toBeInTheDocument()
    expect(screen.getByText(/kept only until the page is reloaded/)).toBeInTheDocument()
    expect(document.title).toBe('Trip not found · AI Travel Planner')
  })

  it('links from "Trip not found" to the plan page', async () => {
    const user = userEvent.setup()
    renderWithRouter(<App />, { route: '/trips/unknown' })
    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'Plan a trip' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Plan a trip' })).toBeInTheDocument()
  })
})
