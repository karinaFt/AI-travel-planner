import type { TripBasics } from '@travel-planner/shared'
import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/ui/Card.tsx'
import { Container } from '../components/ui/Container.tsx'
import { PageHeading } from '../components/ui/PageHeading.tsx'
import { TripBasicsForm } from '../features/trip-setup/TripBasicsForm.tsx'
import { TripBasicsSummary } from '../features/trip-setup/TripBasicsSummary.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

type Step = { name: 'form' } | { name: 'summary'; basics: TripBasics }

export function PlanPage() {
  useDocumentTitle('Plan a trip')
  const [step, setStep] = useState<Step>({ name: 'form' })
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null)
  const destinationRef = useRef<HTMLInputElement>(null)
  const hasSwitchedStep = useRef(false)

  // Move focus with the step change, as the layout does for page changes.
  useEffect(() => {
    if (!hasSwitchedStep.current) return
    if (step.name === 'summary') summaryHeadingRef.current?.focus()
    else destinationRef.current?.focus()
  }, [step])

  function goTo(next: Step) {
    hasSwitchedStep.current = true
    setStep(next)
  }

  return (
    <Container className="py-12 sm:py-16">
      <PageHeading>Plan a trip</PageHeading>
      <p className="mt-3 max-w-2xl text-muted">
        Start with the basics: where you are going, when, and what you would like to spend.
      </p>
      <Card className="mt-8 max-w-3xl">
        {/* The form stays mounted while hidden, so "Edit details" returns with every value. */}
        <div hidden={step.name !== 'form'}>
          <TripBasicsForm
            onSubmit={(basics) => goTo({ name: 'summary', basics })}
            destinationRef={destinationRef}
          />
        </div>
        {step.name === 'summary' && (
          <TripBasicsSummary
            basics={step.basics}
            headingRef={summaryHeadingRef}
            onEdit={() => goTo({ name: 'form' })}
          />
        )}
      </Card>
    </Container>
  )
}
