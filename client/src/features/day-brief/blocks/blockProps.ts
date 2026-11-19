import type { Activity, DayBrief, DayBriefBlock } from '@travel-planner/shared'

/** What every block component gets: its block and the day it describes, as the day is now. */
export type BlockProps<B extends DayBriefBlock = DayBriefBlock> = {
  block: B
  activities: readonly Activity[]
  titles: DayBrief['activityTitles']
  currency: string
}
