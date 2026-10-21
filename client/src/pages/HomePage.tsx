import { Card } from '../components/ui/Card.tsx'
import { ButtonLink } from '../components/ui/ButtonLink.tsx'
import { Container } from '../components/ui/Container.tsx'
import { PageHeading } from '../components/ui/PageHeading.tsx'
import { buttonStyles } from '../components/ui/buttonStyles.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

const steps = [
  {
    title: 'Describe your trip',
    text: 'Tell us where and when you are going, your budget, who is travelling and what you enjoy.',
  },
  {
    title: 'Get an AI itinerary',
    text: 'A day-by-day plan with timed activities and estimated costs, generated for your preferences.',
  },
  {
    title: 'Refine and keep it',
    text: 'Add, edit, move or remove activities, watch the budget, and keep the trip in your browser.',
  },
]

export function HomePage() {
  useDocumentTitle()

  return (
    <>
      <section className="overflow-hidden">
        <Container className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <p className="mb-4 text-sm font-semibold tracking-wide text-coral-text uppercase">
              AI travel planner
            </p>
            <PageHeading className="text-4xl sm:text-5xl lg:text-6xl">
              Plan your next trip with AI
            </PageHeading>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Tell us where and when you are going, and get a calm, day-by-day itinerary with
              estimated costs that you can review and adjust.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink to="/plan" size="lg">
                Plan a trip
              </ButtonLink>
              <a href="#how-it-works" className={buttonStyles({ variant: 'ghost', size: 'lg' })}>
                How it works
              </a>
            </div>
          </div>
          <RouteIllustration />
        </Container>
      </section>

      <section id="how-it-works" aria-labelledby="how-it-works-heading" className="scroll-mt-6 py-14 sm:py-20">
        <Container>
          <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl">
            How it works
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card as="li" key={step.title}>
                <span
                  aria-hidden="true"
                  className="mb-5 inline-flex size-10 items-center justify-center rounded-pill bg-mint font-display text-lg font-semibold text-primary"
                >
                  {index + 1}
                </span>
                <h3 className="text-xl">{step.title}</h3>
                <p className="mt-2 text-muted">{step.text}</p>
              </Card>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <div className="rounded-card bg-mint px-6 py-12 text-center sm:px-12">
            <h2 className="text-3xl sm:text-4xl">Ready when you are</h2>
            <p className="mx-auto mt-4 max-w-lg text-muted">
              It takes a minute to describe your trip. The planning is on us.
            </p>
            <ButtonLink to="/plan" size="lg" className="mt-8">
              Plan a trip
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  )
}

/** Decorative only: a dashed route between three pins over soft color shapes. */
function RouteIllustration() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-testid="route-illustration"
      viewBox="0 0 400 320"
      className="mx-auto w-full max-w-md"
    >
      <circle cx="120" cy="110" r="90" className="fill-mint" />
      <circle cx="300" cy="210" r="80" className="fill-sky" />
      <circle cx="310" cy="70" r="36" className="fill-coral-soft" />
      <path
        d="M70 250 C 120 160, 190 250, 230 170 S 320 80, 340 70"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 12"
        className="stroke-primary"
      />
      {[
        [70, 250],
        [230, 170],
        [340, 70],
      ].map(([x, y], index) => (
        <g key={index} transform={`translate(${x} ${y})`}>
          <path
            d="M0 0 C -14 -16, -14 -34, 0 -38 C 14 -34, 14 -16, 0 0 Z"
            className={index === 2 ? 'fill-coral' : 'fill-primary'}
          />
          <circle cy="-26" r="5" className="fill-surface" />
        </g>
      ))}
    </svg>
  )
}
