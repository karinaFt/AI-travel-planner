import { Link, NavLink } from 'react-router'
import { APP_NAME } from '../config.ts'

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link to="/" className="site-header__name">
        {APP_NAME}
      </Link>
      <nav aria-label="Main">
        <ul className="site-header__links">
          <li>
            <NavLink to="/" end>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/plan">Plan a trip</NavLink>
          </li>
        </ul>
      </nav>
    </header>
  )
}
