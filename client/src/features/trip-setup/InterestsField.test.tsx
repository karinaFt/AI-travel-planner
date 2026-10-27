import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PREFERENCE_MESSAGES } from '@travel-planner/shared'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { InterestsField } from './InterestsField.tsx'

function Harness({ initial = [] as string[], onSubmit = vi.fn() }) {
  const [interests, setInterests] = useState(initial)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(interests)
      }}
    >
      <InterestsField value={interests} onChange={setInterests} />
      <button type="submit">Submit</button>
    </form>
  )
}

function input() {
  return screen.getByRole('textbox', { name: 'Interests (optional)' })
}

function listedInterests() {
  const list = screen.queryByRole('list', { name: 'Your interests' })
  return list ? within(list).getAllByRole('listitem').map((item) => item.textContent) : []
}

describe('InterestsField', () => {
  it('adds an interest with Enter without submitting the form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    await user.type(input(), '  street art  {Enter}')

    expect(listedInterests()).toEqual(['street art'])
    expect(input()).toHaveValue('')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Added street art')).toBeInTheDocument()
  })

  it('adds an interest with the Add button', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(input(), 'markets')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(listedInterests()).toEqual(['markets'])
  })

  it('removes an interest', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['street art', 'wine']} />)

    await user.click(screen.getByRole('button', { name: 'Remove street art' }))

    expect(listedInterests()).toEqual(['wine'])
    expect(screen.getByText('Removed street art')).toBeInTheDocument()
  })

  it.each(['a', 'x'.repeat(41)])('rejects %j as too short or too long', async (text) => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(input(), `${text}{Enter}`)

    expect(listedInterests()).toEqual([])
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).toHaveAccessibleDescription(expect.stringContaining(PREFERENCE_MESSAGES.interestLength))
  })

  it('rejects a duplicate ignoring case', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['museums']} />)

    await user.type(input(), 'Museums{Enter}')

    expect(listedInterests()).toEqual(['museums'])
    expect(input()).toHaveAccessibleDescription(expect.stringContaining(PREFERENCE_MESSAGES.interestDuplicate))
  })

  it('clears the add error while typing again', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(input(), 'a{Enter}')
    await user.type(input(), 'b')

    expect(input()).not.toHaveAttribute('aria-invalid')
  })

  it('stops at ten interests', () => {
    const ten = Array.from({ length: 10 }, (_, i) => `interest ${i}`)
    render(<Harness initial={ten} />)

    expect(input()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    expect(input()).toHaveAccessibleDescription(PREFERENCE_MESSAGES.interestCount)
  })
})
