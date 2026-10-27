import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
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
})
