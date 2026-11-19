import type { BudgetNoteBlock } from '@travel-planner/shared'
import { formatMoney, plural } from '../../trip-setup/format.ts'
import { dayBudget } from '../dayBudget.ts'
import type { BlockProps } from './blockProps.ts'

/** Where the day's money goes, computed from the activities as they are now, with the model's comment. */
export function BudgetTable({ block, activities, currency }: BlockProps<BudgetNoteBlock>) {
  const { rows, freeCount } = dayBudget(activities)
  return (
    <div className="mt-3">
      {rows.length === 0 ? (
        <p className="text-ink">Every activity on this day is free.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Estimated cost of each activity and its share of the day</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Activity</th>
              <th scope="col">Share</th>
              <th scope="col">Cost</th>
              <th scope="col">Percent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line first:border-t-0">
                <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">
                  {row.title}
                </th>
                <td className="hidden w-2/5 py-2 pr-3 sm:table-cell">
                  <div aria-hidden="true" className="h-2 overflow-hidden rounded-pill bg-line">
                    <div className="h-full rounded-pill bg-primary" style={{ width: `${row.percent}%` }} />
                  </div>
                </td>
                <td className="py-2 pr-3 text-right whitespace-nowrap text-ink tabular-nums">
                  {formatMoney(row.amount, currency)}
                </td>
                <td className="w-12 py-2 text-right text-muted tabular-nums">{row.percent}%</td>
              </tr>
            ))}
            {freeCount > 0 && (
              <tr className="border-t border-line">
                <th scope="row" colSpan={4} className="py-2 text-left font-normal text-muted">
                  Free: {plural(freeCount, 'activity', 'activities')}
                </th>
              </tr>
            )}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-sm text-ink">{block.text}</p>
    </div>
  )
}
