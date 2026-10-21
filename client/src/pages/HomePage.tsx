import { Link } from 'react-router'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function HomePage() {
  useDocumentTitle()

  return (
    <>
      <h1>Plan your next trip with AI</h1>
      <p>
        Tell us where and when you are going, and get a day-by-day itinerary you
        can review and adjust.
      </p>
      <p>
        <Link to="/plan">Plan a trip</Link>
      </p>
    </>
  )
}
