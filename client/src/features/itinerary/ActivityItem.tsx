import type { Activity } from '@travel-planner/shared'
import { useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { DeleteConfirmation } from '../editing/DeleteConfirmation.tsx'
import { formatMoney } from '../trip-setup/format.ts'
import { categoryLabel, formatDuration, formatTimeRange } from './format.ts'

type ActivityItemProps = {
  activity: Activity
  onEdit: () => void
  /** Called once the user has confirmed. */
  onDelete: () => void
}

const actionClass = 'text-sm font-semibold text-primary underline-offset-4 hover:underline'

/** One activity of the day: always its time, title, category and cost; the rest behind a toggle. */
export function ActivityItem({ activity, onEdit, onDelete }: ActivityItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const deleteRef = useRef<HTMLButtonElement>(null)
  const detailsId = useId()
  const toggleText = expanded ? 'Hide details' : 'Details'
  const { id, title, description, category, startTime, durationMinutes, estimatedCost, currency } = activity

  const keep = () => {
    flushSync(() => setConfirming(false))
    deleteRef.current?.focus()
  }

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
            className={actionClass}
          >
            {toggleText}
          </button>
          <button
            type="button"
            aria-label={`Edit ${title}`}
            data-action="edit"
            data-activity-id={id}
            onClick={onEdit}
            className={actionClass}
          >
            Edit
          </button>
          <button
            ref={deleteRef}
            type="button"
            aria-label={`Delete ${title}`}
            onClick={() => setConfirming(true)}
            className="text-sm font-semibold text-coral-text underline-offset-4 hover:underline"
          >
            Delete
          </button>
        </div>
        {confirming && <DeleteConfirmation title={title} onDelete={onDelete} onKeep={keep} />}
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
