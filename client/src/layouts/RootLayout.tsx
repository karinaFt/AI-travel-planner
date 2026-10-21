import { useEffect, useRef, type MouseEvent } from 'react'
import { Outlet, useLocation } from 'react-router'
import { SiteHeader } from '../components/SiteHeader.tsx'

export function RootLayout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  // Compare keys instead of using an "initial render" flag: StrictMode runs
  // effects twice on mount, and the initial page must not steal focus.
  const lastLocationKey = useRef(location.key)

  // After in-app navigation, move focus to the new page's heading so screen
  // readers announce it and the next Tab starts from the page content.
  useEffect(() => {
    if (location.key === lastLocationKey.current) {
      return
    }
    lastLocationKey.current = location.key
    const main = mainRef.current
    const heading = main?.querySelector<HTMLElement>('h1')
    ;(heading ?? main)?.focus()
  }, [location.key])

  // Focus <main> directly: following "#main" would add a history entry that the
  // router treats as navigation.
  function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    mainRef.current?.focus()
  }

  return (
    <>
      <a
        href="#main"
        onClick={skipToContent}
        className="sr-only rounded-pill bg-primary px-4 py-2 font-semibold text-surface focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-10"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" ref={mainRef} tabIndex={-1} className="focus:outline-none">
        <Outlet />
      </main>
    </>
  )
}
