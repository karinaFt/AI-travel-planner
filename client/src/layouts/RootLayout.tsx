import { Outlet } from 'react-router'
import '../layout.css'
import { SiteHeader } from '../components/SiteHeader.tsx'

export function RootLayout() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
