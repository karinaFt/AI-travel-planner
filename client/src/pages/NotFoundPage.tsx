import { Link } from 'react-router'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <>
      <h1>Page not found</h1>
      <p>We could not find the page you were looking for.</p>
      <p>
        <Link to="/">Go to the home page</Link>
      </p>
    </>
  )
}
