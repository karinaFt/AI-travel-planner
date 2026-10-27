import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App.tsx'
import { renderWithRouter } from '../../test/renderWithRouter.tsx'
import { PACE_OPTIONS, TRAVEL_STYLE_OPTIONS } from './styleOptions.ts'

export type PreferencesInput = {
  destination?: string
  origin?: string
  startDate?: string
  endDate?: string
  budget?: string
  currency?: string
  travelers?: string
  travelStyle?: string
  pace?: string
  interests?: string[]
}

export const tripFields = {
  destination: () => screen.getByRole('textbox', { name: 'Destination' }),
  origin: () => screen.getByRole('textbox', { name: 'Starting from (optional)' }),
  startDate: () => screen.getByLabelText('Start date'),
  endDate: () => screen.getByLabelText('End date'),
  budget: () => screen.getByRole('textbox', { name: 'Total budget' }),
  currency: () => screen.getByRole('combobox', { name: 'Currency' }),
  travelers: () => screen.getByRole('textbox', { name: 'Number of travelers' }),
  travelStyle: () => screen.getByRole('group', { name: 'Travel style' }),
  pace: () => screen.getByRole('group', { name: 'Pace' }),
  interests: () => screen.getByRole('textbox', { name: 'Interests (optional)' }),
  submit: () => screen.getByRole('button', { name: 'Review trip' }),
}

export function renderPlanPage() {
  const user = userEvent.setup()
  renderWithRouter(<App />, { route: '/plan' })
  return user
}

function optionTitle(options: ReadonlyArray<{ value: string; title: string }>, value: string) {
  return options.find((option) => option.value === value)?.title ?? value
}

/** Fills the given values into the form (fields left out are not touched). */
export async function fillPreferences(
  user: ReturnType<typeof userEvent.setup>,
  input: PreferencesInput,
) {
  for (const key of ['destination', 'origin', 'startDate', 'endDate', 'budget', 'travelers'] as const) {
    const value = input[key]
    if (value === undefined) continue
    const field = tripFields[key]()
    await user.clear(field)
    if (value !== '') await user.type(field, value)
  }
  if (input.currency) {
    await user.selectOptions(tripFields.currency(), input.currency)
  }
  if (input.travelStyle) {
    await user.click(screen.getByRole('radio', { name: optionTitle(TRAVEL_STYLE_OPTIONS, input.travelStyle) }))
  }
  if (input.pace) {
    await user.click(screen.getByRole('radio', { name: optionTitle(PACE_OPTIONS, input.pace) }))
  }
  for (const interest of input.interests ?? []) {
    await user.type(tripFields.interests(), `${interest}{Enter}`)
  }
}

export const validPreferences = {
  destination: 'Lisbon',
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  budget: '1500',
  currency: 'EUR',
  travelers: '2',
  travelStyle: 'food',
} satisfies PreferencesInput
