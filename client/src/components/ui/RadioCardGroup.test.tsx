import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RadioCardGroup, type RadioCardOption } from './RadioCardGroup.tsx'

const options: RadioCardOption[] = [
  { value: 'relaxed', title: 'Relaxed', description: '2–3 activities a day' },
  { value: 'balanced', title: 'Balanced', description: '3–5 activities a day' },
  { value: 'packed', title: 'Packed', description: '5–7 activities a day' },
]

function renderGroup(error?: string) {
  return render(
    <RadioCardGroup legend="Pace" options={options} error={error} inputProps={{ name: 'pace' }} />,
  )
}

describe('RadioCardGroup', () => {
  it('groups the options under the legend', () => {
    renderGroup()

    const group = screen.getByRole('group', { name: 'Pace' })
    expect(within(group).getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Balanced' })).toHaveAccessibleDescription(
      '3–5 activities a day',
    )
  })

  it('moves the selection with the arrow keys', async () => {
    const user = userEvent.setup()
    renderGroup()

    await user.click(screen.getByRole('radio', { name: 'Relaxed' }))
    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('radio', { name: 'Balanced' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Balanced' })).toHaveFocus()
  })

  it('is a single tab stop', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Before</button>
        <RadioCardGroup legend="Pace" options={options} inputProps={{ name: 'pace' }} />
        <button type="button">After</button>
      </>,
    )

    await user.click(screen.getByRole('button', { name: 'Before' }))
    await user.tab()
    expect(screen.getByRole('radio', { name: 'Relaxed' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
  })

  it('announces the error with the group and marks the options invalid', () => {
    renderGroup('Choose a pace')

    expect(screen.getByRole('group', { name: 'Pace' })).toHaveAccessibleDescription('Choose a pace')
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveAttribute('aria-invalid', 'true')
    }
  })

  it('has no error description when valid', () => {
    renderGroup()

    expect(screen.getByRole('group', { name: 'Pace' })).not.toHaveAttribute('aria-describedby')
  })
})
