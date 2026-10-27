import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter.tsx'
import { Button } from './Button.tsx'
import { ButtonLink } from './ButtonLink.tsx'
import { buttonStyles } from './buttonStyles.ts'
import { Card } from './Card.tsx'
import { PageHeading } from './PageHeading.tsx'

describe('Button', () => {
  it('renders a button that does not submit forms by default', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('keeps an explicit type', () => {
    render(<Button type="submit">Send</Button>)

    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit')
  })
})

describe('ButtonLink', () => {
  it('renders a real link to the target', () => {
    renderWithRouter(<ButtonLink to="/plan">Plan a trip</ButtonLink>)

    expect(screen.getByRole('link', { name: 'Plan a trip' })).toHaveAttribute('href', '/plan')
  })
})

describe('buttonStyles', () => {
  it('gives every variant its own classes', () => {
    const classes = (['primary', 'secondary', 'ghost'] as const).map((variant) =>
      buttonStyles({ variant }),
    )

    expect(new Set(classes).size).toBe(3)
  })

  it('appends extra classes', () => {
    expect(buttonStyles({ className: 'w-full' })).toMatch(/ w-full$/)
  })
})

describe('Card', () => {
  it('renders the requested element', () => {
    render(
      <ul>
        <Card as="li">Step</Card>
      </ul>,
    )

    expect(screen.getByRole('listitem')).toHaveTextContent('Step')
  })
})

describe('PageHeading', () => {
  it('is a level-1 heading focusable from script only', () => {
    render(<PageHeading>Plan a trip</PageHeading>)

    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('tabindex', '-1')
  })
})
