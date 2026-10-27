import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DateInput } from './DateInput.tsx'
import { Field } from './Field.tsx'
import { Select } from './Select.tsx'
import { TextInput } from './TextInput.tsx'

describe('Field', () => {
  it('associates the label with the control', () => {
    render(<Field label="Destination">{(control) => <TextInput {...control} />}</Field>)

    expect(screen.getByRole('textbox', { name: 'Destination' })).toBeInTheDocument()
  })

  it('describes the control with the hint', () => {
    render(
      <Field label="Budget" hint="Use a dot for decimals">
        {(control) => <TextInput {...control} />}
      </Field>,
    )

    const input = screen.getByRole('textbox', { name: 'Budget' })
    expect(input).toHaveAccessibleDescription('Use a dot for decimals')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('marks the control invalid and describes it with the error', () => {
    render(
      <Field label="Budget" hint="Use a dot for decimals" error="Budget must be greater than 0">
        {(control) => <TextInput {...control} />}
      </Field>,
    )

    const input = screen.getByRole('textbox', { name: 'Budget' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Use a dot for decimals Budget must be greater than 0')
  })

  it('wires date inputs and selects the same way', () => {
    render(
      <>
        <Field label="Start date" error="Enter a valid date">
          {(control) => <DateInput {...control} />}
        </Field>
        <Field label="Currency">
          {(control) => (
            <Select {...control}>
              <option value="EUR">EUR — Euro</option>
            </Select>
          )}
        </Field>
      </>,
    )

    expect(screen.getByLabelText('Start date')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Start date')).toHaveAccessibleDescription('Enter a valid date')
    expect(screen.getByRole('combobox', { name: 'Currency' })).not.toHaveAttribute('aria-invalid')
  })
})
