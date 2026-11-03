import { Link, NavLink } from 'react-router'
import { APP_NAME } from '../config.ts'
import { Container } from './ui/Container.tsx'

const navLinkClass =
  'rounded-pill px-4 py-2 text-sm font-medium text-muted no-underline transition-[color,background-color] hover:text-ink motion-reduce:transition-none aria-[current=page]:bg-mint aria-[current=page]:text-primary'

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface/90 backdrop-blur">
      <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
        <Link to="/" className="font-display text-xl font-semibold text-ink no-underline">
          {APP_NAME}
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap gap-1">
            <li>
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/plan" className={navLinkClass}>
                Plan a trip
              </NavLink>
            </li>
            <li>
              {/* `end`, so a trip's own page doesn't mark "My trips" as the current page. */}
              <NavLink to="/trips" end className={navLinkClass}>
                My trips
              </NavLink>
            </li>
          </ul>
        </nav>
      </Container>
    </header>
  )
}
