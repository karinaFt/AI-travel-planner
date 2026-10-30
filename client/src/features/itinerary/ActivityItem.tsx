import type { Activity } from '@travel-planner/shared'
import { useId, useState } from 'react'
import { formatMoney } from '../trip-setup/format.ts'
import { categoryLabel, formatDuration, formatTimeRange } from './format.ts'

/** One activity of the day: always its time, title, category and cost; the rest behind a toggle. */
export function ActivityItem({ activity }: { activity: Activity }) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const toggleText = expanded ? 'Hide details' : 'Details'
  const { title, description, category, startTime, durationMinutes, estimatedCost, currency } = activity

  return (
    <li className="grid grid-cols-[3.5rem_1fr] gap-x-4 border-t border-line py-4 first:border-t-0 sm:grid-cols-[4rem_1fr]">
      <time className="pt-0.5 font-semibold text-primary tabular-nums">{startTime}</time>
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-sans text-base font-semibold text-ink">{title}</h3>
          <span className="text-ink tabular-nums">{estimatedCost === 0 ? 'Free' : formatMoney(estimatedCost, currency)}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="rounded-pill bg-canvas px-2.5 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">
            {categoryLabel(category)}
          </span>
          <button
            type="button"
            // The name starts with the visible text and adds the title, so each toggle is distinct.
            aria-label={`${toggleText} for ${title}`}
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((value) => !value)}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {toggleText}
          </button>
        </div>
        {/* The hidden attribute sits on a wrapper so the flex layout below cannot override it. */}
        <div id={detailsId} hidden={!expanded}>
          <div className="mt-3 flex flex-col gap-2 text-sm text-ink">
            <p>
              {formatTimeRange(startTime, durationMinutes)} · {formatDuration(durationMinutes)}
            </p>
            {description && <p className="whitespace-pre-line">{description}</p>}
            <p className="text-muted">Estimated cost for the whole group.</p>
          </div>
        </div>
      </div>
    </li>
  )
}
