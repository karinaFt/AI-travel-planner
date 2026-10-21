import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'
import { renderWithRouter } from './test/renderWithRouter.tsx'

function mainNav() {
  return screen.getByRole('navigation', { name: 'Main' })
}

describe('App shell', () => {
  it('shows the app name in the header as a link home', () => {
    renderWithRouter(<App />, { route: '/plan' })

    const header = screen.getByRole('banner')
    expect(
      within(header).getByRole('link', { name: 'AI Travel Planner' }),
    ).toHaveAttribute('href', '/')
  })

  it.each(['/', '/plan', '/does-not-exist'])(
    'does not mention the old name on %s',
    (route) => {
      const { container } = renderWithRouter(<App />, { route })

      expect(container).not.toHaveTextContent('Smart Doc Assistant')
      expect(document.title).not.toContain('Smart Doc Assistant')
    },
  )

  it.each([
    ['/', 'AI Travel Planner'],
    ['/plan', 'Plan a trip · AI Travel Planner'],
    ['/does-not-exist', 'Page not found · AI Travel Planner'],
  ])('sets the document title on %s', (route, title) => {
    renderWithRouter(<App />, { route })

    expect(document.title).toBe(title)
  })

  it('renders exactly one main landmark', () => {
    renderWithRouter(<App />)

    expect(screen.getAllByRole('main')).toHaveLength(1)
  })
})

describe('Home page', () => {
  it('has one top-level heading and a description', () => {
    renderWithRouter(<App />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByText(/day-by-day itinerary you can review and adjust/),
    ).toBeInTheDocument()
  })

  it('links to the plan page from its content', async () => {
    const user = userEvent.setup()
    renderWithRouter(<App />)

    const main = screen.getByRole('main')
    await user.click(within(main).getByRole('link', { name: 'Plan a trip' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Plan a trip' }),
    ).toBeInTheDocument()
  })
})

describe('Plan page', () => {
  it('shows the heading and the coming-soon message', () => {
    renderWithRouter(<App />, { route: '/plan' })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Plan a trip' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/trip form is coming soon/i)).toBeInTheDocument()
  })
})

describe('Header navigation', () => {
  it('marks Home as current on the home page', () => {
    renderWithRouter(<App />)

    const nav = mainNav()
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      within(nav).getByRole('link', { name: 'Plan a trip' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('moves the current marker when navigating to the plan page', async () => {
    const user = userEvent.setup()
    renderWithRouter(<App />)

    await user.click(within(mainNav()).getByRole('link', { name: 'Plan a trip' }))

    const nav = mainNav()
    expect(
      within(nav).getByRole('link', { name: 'Plan a trip' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('can be used with the keyboard', async () => {
    const user = userEvent.setup()
    renderWithRouter(<App />)

    await user.tab()
    expect(
      screen.getByRole('link', { name: 'AI Travel Planner' }),
    ).toHaveFocus()
    await user.tab()
    expect(within(mainNav()).getByRole('link', { name: 'Home' })).toHaveFocus()
    await user.tab()
    const planLink = within(mainNav()).getByRole('link', { name: 'Plan a trip' })
    expect(planLink).toHaveFocus()

    await user.keyboard('{Enter}')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Plan a trip' }),
    ).toBeInTheDocument()
  })
})

describe('Unknown routes', () => {
  it('shows the not-found page with the header', () => {
    renderWithRouter(<App />, { route: '/does-not-exist' })

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument()
  })

  it('links back to the home page', async () => {
    const user = userEvent.setup()
    renderWithRouter(<App />, { route: '/does-not-exist' })

    await user.click(screen.getByRole('link', { name: 'Go to the home page' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Plan your next trip with AI' }),
    ).toBeInTheDocument()
  })
})
