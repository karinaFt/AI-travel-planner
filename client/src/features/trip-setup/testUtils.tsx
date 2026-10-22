import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App.tsx'
import { renderWithRouter } from '../../test/renderWithRouter.tsx'

export type BasicsInput = {
  destination?: string
  startDate?: string
  endDate?: string
  budget?: string
  currency?: string
  travelers?: string
}

export const tripFields = {
  destination: () => screen.getByRole('textbox', { name: 'Destination' }),
  startDate: () => screen.getByLabelText('Start date'),
  endDate: () => screen.getByLabelText('End date'),
  budget: () => screen.getByRole('textbox', { name: 'Total budget' }),
  currency: () => screen.getByRole('combobox', { name: 'Currency' }),
  travelers: () => screen.getByRole('textbox', { name: 'Number of travelers' }),
  submit: () => screen.getByRole('button', { name: 'Continue' }),
}

export function renderPlanPage() {
  const user = userEvent.setup()
  renderWithRouter(<App />, { route: '/plan' })
  return user
}

/** Types the given values into the form (fields left out are not touched). */
export async function fillBasics(user: ReturnType<typeof userEvent.setup>, input: BasicsInput) {
  for (const key of ['destination', 'startDate', 'endDate', 'budget', 'travelers'] as const) {
    const value = input[key]
    if (value === undefined) continue
    const field = tripFields[key]()
    await user.clear(field)
    if (value !== '') await user.type(field, value)
  }
  if (input.currency) {
    await user.selectOptions(tripFields.currency(), input.currency)
  }
}

export const validBasics: Required<BasicsInput> = {
  destination: 'Lisbon',
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  budget: '1500',
  currency: 'EUR',
  travelers: '2',
}
