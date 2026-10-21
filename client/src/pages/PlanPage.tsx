import { Card } from '../components/ui/Card.tsx'
import { Container } from '../components/ui/Container.tsx'
import { PageHeading } from '../components/ui/PageHeading.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function PlanPage() {
  useDocumentTitle('Plan a trip')

  return (
    <Container className="py-12 sm:py-16">
      <PageHeading>Plan a trip</PageHeading>
      <Card className="mt-8 max-w-2xl">
        <p className="text-muted">The trip form is coming soon.</p>
      </Card>
    </Container>
  )
}
