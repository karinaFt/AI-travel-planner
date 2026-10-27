import type { TripPreferences } from '@travel-planner/shared'
import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/ui/Card.tsx'
import { Container } from '../components/ui/Container.tsx'
import { PageHeading } from '../components/ui/PageHeading.tsx'
import { TripPreferencesForm } from '../features/trip-setup/TripPreferencesForm.tsx'
import { TripReview } from '../features/trip-setup/TripReview.tsx'
import { useTripDraft } from '../features/trip-setup/tripDraftContext.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

type Step = { name: 'form' } | { name: 'review'; preferences: TripPreferences }

export function PlanPage() {
  useDocumentTitle('Plan a trip')
  const draft = useTripDraft()
  const [step, setStep] = useState<Step>({ name: 'form' })
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null)
  const destinationRef = useRef<HTMLInputElement>(null)
  const hasSwitchedStep = useRef(false)

  // Move focus with the step change, as the layout does for page changes.
  useEffect(() => {
    if (!hasSwitchedStep.current) return
    if (step.name === 'review') reviewHeadingRef.current?.focus()
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
        Tell us about your trip: where and when, your budget, and the kind of days you enjoy.
      </p>
      <Card className="mt-8 max-w-3xl">
        {step.name === 'form' ? (
          // The form starts from the draft, so returning from the review or from
          // another page shows every value entered so far.
          <TripPreferencesForm
            initialValues={draft.get()}
            onValuesChange={draft.save}
            onSubmit={(preferences) => goTo({ name: 'review', preferences })}
            destinationRef={destinationRef}
          />
        ) : (
          <TripReview
            preferences={step.preferences}
            headingRef={reviewHeadingRef}
            onEdit={() => goTo({ name: 'form' })}
          />
        )}
      </Card>
    </Container>
  )
}
