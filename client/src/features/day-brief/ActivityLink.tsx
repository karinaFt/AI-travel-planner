import type { Activity, DayBrief } from '@travel-planner/shared'
import { jumpToActivity } from './jumpToActivity.ts'

type ActivityLinkProps = {
  activityId: string
  activities: readonly Activity[]
  /** Titles saved with the overview, for activities deleted since. */
  titles: DayBrief['activityTitles']
  /** Shown before the title, such as the start time. */
  showTime?: boolean
}

/** An activity mentioned in the overview: a button that jumps to it, or plain text once it's gone. */
export function ActivityLink({ activityId, activities, titles, showTime = false }: ActivityLinkProps) {
  const activity = activities.find((a) => a.id === activityId)
  if (!activity) {
    return <span className="font-semibold text-ink">{titles?.[activityId] ?? 'a removed activity'}</span>
  }
  return (
    <button
      type="button"
      onClick={() => jumpToActivity(activityId)}
      className="text-left font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
    >
      {showTime && <span className="tabular-nums">{activity.startTime} </span>}
      {activity.title}
    </button>
  )
}
