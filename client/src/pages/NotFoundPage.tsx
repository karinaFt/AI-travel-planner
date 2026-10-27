import { ButtonLink } from '../components/ui/ButtonLink.tsx'
import { Container } from '../components/ui/Container.tsx'
import { PageHeading } from '../components/ui/PageHeading.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <Container className="py-16 text-center sm:py-24">
      <p className="text-sm font-semibold tracking-wide text-coral-text uppercase">404</p>
      <PageHeading className="mt-3">Page not found</PageHeading>
      <p className="mt-4 text-muted">We could not find the page you were looking for.</p>
      <ButtonLink to="/" variant="secondary" className="mt-8">
        Go to the home page
      </ButtonLink>
    </Container>
  )
}
