import { ACTIVITY_LIMITS, type Activity, type Day } from '@travel-planner/shared'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Button } from '../../components/ui/Button.tsx'
import { ActivityForm } from '../editing/ActivityForm.tsx'
import { activityValues, newActivityValues, type ActivityFormOutput } from '../editing/activityFormSchema.ts'
import { formatMoney, plural } from '../trip-setup/format.ts'
import { ActivityItem } from './ActivityItem.tsx'
import { DAY_PANEL_ID, dayTabId } from './dayIds.ts'
import { formatDayDate } from './format.ts'
import type { ApplyEdit } from './ItineraryView.tsx'

type DayTimelineProps = {
  day: Day
  /** Every day of the trip, for moving an activity. */
  days: readonly Day[]
  estimatedCost: number
  currency: string
  onEdit: ApplyEdit
}

/** Which form is open; at most one at a time. */
type Editing = { mode: 'add' } | { mode: 'edit'; activityId: string } | null

/** The selected day's tab panel: its heading and totals, its activities in start-time order, and editing. */
export function DayTimeline({ day, days, estimatedCost, currency, onEdit }: DayTimelineProps) {
  const [editing, setEditing] = useState<Editing>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const count = day.activities.length
  const full = count >= ACTIVITY_LIMITS.perDay.max

  /** Runs `update` and renders it right away, so the element to focus is in the DOM. */
  const thenFocus = (update: () => void, selector: string | null) => {
    flushSync(update)
    const panel = panelRef.current
    const target = selector ? panel?.querySelector<HTMLElement>(selector) : panel
    target?.focus()
  }
  const editButton = (activityId: string) => `[data-action="edit"][data-activity-id="${activityId}"]`
  const addButton = '[data-action="add"]'
  const dayNumber = (dayId: string) => days.find((d) => d.id === dayId)?.dayNumber

  const save = (activity: Activity | null, { dayId, draft }: ActivityFormOutput) => {
    const id = activity?.id ?? crypto.randomUUID()
    const sameDay = dayId === day.id
    const message = !sameDay
      ? activity
        ? `Moved "${draft.title}" to Day ${dayNumber(dayId)}.`
        : `Added "${draft.title}" to Day ${dayNumber(dayId)}.`
      : activity
        ? `Saved "${draft.title}".`
        : `Added "${draft.title}".`
    const action = activity
      ? ({ type: 'update', activityId: id, dayId, draft } as const)
      : ({ type: 'add', dayId, id, draft } as const)

    thenFocus(
      () => {
        if (onEdit(action, message)) setEditing(null)
      },
      sameDay ? editButton(id) : null,
    )
  }

  const cancel = () => thenFocus(() => setEditing(null), editing?.mode === 'edit' ? editButton(editing.activityId) : addButton)

  const remove = (activity: Activity) =>
    thenFocus(() => {
      onEdit({ type: 'delete', activityId: activity.id }, `Deleted "${activity.title}".`)
    }, addButton)

  return (
    <div
      ref={panelRef}
      role="tabpanel"
      id={DAY_PANEL_ID}
      aria-labelledby={dayTabId(day.dayNumber)}
      tabIndex={0}
      className="pt-6"
    >
      <h2 className="text-2xl">
        Day {day.dayNumber} · {formatDayDate(day.date, 'long')}
      </h2>
      <p className="mt-1 text-lg text-ink">{day.title}</p>
      <p className="mt-2 text-sm text-muted">
        {plural(count, 'activity', 'activities')} · Estimated {formatMoney(estimatedCost, currency)}
      </p>
      {count === 0 ? (
        <p className="mt-6 rounded-xl bg-sky px-4 py-3 text-ink">No activities are planned for this day.</p>
      ) : (
        <ol className="mt-4">
          {day.activities.map((activity) =>
            editing?.mode === 'edit' && editing.activityId === activity.id ? (
              <li key={activity.id} className="border-t border-line py-4 first:border-t-0">
                <ActivityForm
                  mode="edit"
                  label={`Edit ${activity.title}`}
                  initialValues={activityValues(activity, day.id)}
                  days={days}
                  currency={currency}
                  onSubmit={(output) => save(activity, output)}
                  onCancel={cancel}
                />
              </li>
            ) : (
              <ActivityItem
                key={activity.id}
                activity={activity}
                onEdit={() => setEditing({ mode: 'edit', activityId: activity.id })}
                onDelete={() => remove(activity)}
              />
            ),
          )}
        </ol>
      )}
      <div className="mt-6">
        {editing?.mode === 'add' ? (
          <ActivityForm
            mode="add"
            label="New activity"
            initialValues={newActivityValues(day.id)}
            days={days}
            currency={currency}
            onSubmit={(output) => save(null, output)}
            onCancel={cancel}
          />
        ) : full ? (
          <p className="text-sm text-muted">A day can hold up to {ACTIVITY_LIMITS.perDay.max} activities.</p>
        ) : (
          <Button variant="secondary" data-action="add" onClick={() => setEditing({ mode: 'add' })}>
            Add activity
          </Button>
        )}
      </div>
    </div>
  )
}
