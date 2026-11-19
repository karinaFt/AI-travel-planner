const bar = 'rounded-md bg-line/70 animate-pulse motion-reduce:animate-none'

/** Placeholder in the shape of the overview while it is being created. Hidden from screen readers. */
export function DayBriefSkeleton() {
  return (
    <div aria-hidden="true" data-testid="day-brief-skeleton" className="mt-5">
      <div className={`aspect-video w-full rounded-xl ${bar}`} />
      <div className={`mt-5 h-7 w-2/3 ${bar}`} />
      <div className={`mt-3 h-4 w-full ${bar}`} />
      <div className={`mt-2 h-4 w-5/6 ${bar}`} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className={`h-24 rounded-xl ${bar}`} />
        <div className={`h-24 rounded-xl ${bar}`} />
      </div>
    </div>
  )
}
