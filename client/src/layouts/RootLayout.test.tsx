import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from '../App.tsx'
import { renderWithRouter } from '../test/renderWithRouter.tsx'

describe('Skip to content', () => {
  it('is the first stop in the tab order', async () => {
    const user = userEvent.setup()
    renderWithRouter(<App />, { route: '/plan' })

    await user.tab()

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus()
  })

  it('moves focus to the main content so the next Tab skips the header', async () => {
    const user = userEvent.setup()
    renderWithRouter(<App />, { route: '/plan' })

    await user.tab()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('main')).toHaveFocus()
    expect(screen.getByRole('heading', { level: 1, name: 'Plan a trip' })).toBeInTheDocument()
  })
})

describe('Focus after navigation', () => {
  it('does not move focus on the initial render', () => {
    renderWithRouter(
      <StrictMode>
        <App />
      </StrictMode>,
    )

    expect(document.body).toHaveFocus()
  })

  it('focuses the new page heading after a header link is used', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <StrictMode>
        <App />
      </StrictMode>,
    )

    const nav = screen.getByRole('navigation', { name: 'Main' })
    await user.click(within(nav).getByRole('link', { name: 'Plan a trip' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Plan a trip' })).toHaveFocus()
  })

  it('keeps focus where it is when only the query changes', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <StrictMode>
        <App />
        <QueryButton />
      </StrictMode>,
      { route: '/plan' },
    )

    await user.click(screen.getByRole('button', { name: 'Change query' }))

    expect(screen.getByTestId('search')).toHaveTextContent('?day=2')
    expect(screen.getByRole('button', { name: 'Change query' })).toHaveFocus()
  })
})

function QueryButton() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <>
      <button type="button" onClick={() => navigate('?day=2')}>
        Change query
      </button>
      <output data-testid="search">{location.search}</output>
    </>
  )
}
