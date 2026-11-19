import { sumMoney, type Activity } from '@travel-planner/shared'

export type BudgetRow = { id: string; title: string; amount: number; percent: number }

export type DayBudget = {
  /** Activities with a cost, most expensive first; equal costs keep their order. */
  rows: BudgetRow[]
  /** Activities that cost nothing. */
  freeCount: number
  total: number
}

/**
 * The day's spending from its current activities, so it stays right after edits. Shares are whole
 * percents of the day's total, so they may not add up to exactly 100.
 */
export function dayBudget(activities: readonly Activity[]): DayBudget {
  const total = sumMoney(activities.map((activity) => activity.estimatedCost))
  const rows = activities
    .filter((activity) => activity.estimatedCost > 0)
    .toSorted((a, b) => b.estimatedCost - a.estimatedCost)
    .map(({ id, title, estimatedCost }) => ({
      id,
      title,
      amount: estimatedCost,
      percent: Math.round((estimatedCost / total) * 100),
    }))
  return { rows, freeCount: activities.length - rows.length, total }
}
