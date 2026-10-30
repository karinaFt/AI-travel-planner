import type { Day } from '@travel-planner/shared'
import { formatMoney, plural } from '../trip-setup/format.ts'
import { ActivityItem } from './ActivityItem.tsx'
import { DAY_PANEL_ID, dayTabId } from './dayIds.ts'
import { formatDayDate } from './format.ts'

type DayTimelineProps = {
  day: Day
  estimatedCost: number
  currency: string
}

/** The selected day's tab panel: its heading and totals, then its activities in start-time order. */
export function DayTimeline({ day, estimatedCost, currency }: DayTimelineProps) {
  const count = day.activities.length

  return (
    <div role="tabpanel" id={DAY_PANEL_ID} aria-labelledby={dayTabId(day.dayNumber)} tabIndex={0} className="pt-6">
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
          {day.activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </ol>
      )}
    </div>
  )
}
