import type { Trip } from '@travel-planner/shared'
import { Route, Routes } from 'react-router'
import { RootLayout } from './layouts/RootLayout.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { PlanPage } from './pages/PlanPage.tsx'
import { TripPage } from './pages/TripPage.tsx'

/** `initialTrips` seeds the in-memory trip store; only tests pass it. */
function App({ initialTrips }: { initialTrips?: readonly Trip[] }) {
  return (
    <Routes>
      <Route element={<RootLayout initialTrips={initialTrips} />}>
        <Route index element={<HomePage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="trips/:id" element={<TripPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
