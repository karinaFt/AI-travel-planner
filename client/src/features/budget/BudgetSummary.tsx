import type { Day } from '@travel-planner/shared'
import { Card } from '../../components/ui/Card.tsx'
import { cx } from '../../components/ui/cx.ts'
import { formatDayDate } from '../itinerary/format.ts'
import { formatMoney } from '../trip-setup/format.ts'
import { budgetSummary } from './budgetSummary.ts'

type BudgetSummaryProps = {
  budget: number
  currency: string
  days: readonly Day[]
  /** `dayCosts[i]` is the estimated cost of `days[i]`. */
  dayCosts: readonly number[]
  estimatedCost: number
}

/** The budget against the plan's estimated cost, a usage bar, and the cost of each day. */
export function BudgetSummary({ budget, currency, days, dayCosts, estimatedCost }: BudgetSummaryProps) {
  const summary = budgetSummary(budget, estimatedCost)
  const over = summary.status === 'over'
  const money = (amount: number) => formatMoney(amount, currency)
  // A plan that costs anything at all shows at least a sliver of the bar.
  const fill = estimatedCost > 0 ? Math.max(Math.min(summary.percentUsed, 100), 1) : 0

  return (
    <Card
      as="section"
      aria-labelledby="budget-heading"
      className={cx('mt-10', over && 'border-l-4 border-l-coral')}
    >
      <h2 id="budget-heading" className="text-2xl">
        Budget
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm font-semibold text-muted">Budget</dt>
          <dd className="mt-0.5 text-ink tabular-nums">{money(budget)}</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-muted">Estimated cost</dt>
          <dd className="mt-0.5 text-ink tabular-nums">{money(estimatedCost)}</dd>
        </div>
        <div>
          <dt className={cx('text-sm font-semibold', over ? 'text-coral-text' : 'text-muted')}>
            {over ? 'Over budget by' : 'Remaining'}
          </dt>
          <dd className={cx('mt-0.5 font-semibold tabular-nums', over ? 'text-coral-text' : 'text-ink')}>
            {money(summary.difference)}
          </dd>
        </div>
      </dl>

      <div
        role="meter"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(summary.percentUsed, 100)}
        aria-valuetext={`${summary.percentUsed}% of budget`}
        className="mt-6 h-2 overflow-hidden rounded-pill bg-line"
      >
        <div className={cx('h-full rounded-pill', over ? 'bg-coral-text' : 'bg-primary')} style={{ width: `${fill}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">{summary.percentUsed}% of budget</p>

      <table className="mt-6 w-full text-left text-sm">
        <caption className="mb-2 text-left font-semibold text-ink">Cost by day</caption>
        <thead className="sr-only sm:not-sr-only">
          <tr className="text-muted">
            <th scope="col" className="py-2 pr-4 font-semibold">Day</th>
            <th scope="col" className="py-2 pr-4 font-semibold">Date</th>
            <th scope="col" className="hidden py-2 pr-4 font-semibold sm:table-cell">Title</th>
            <th scope="col" className="py-2 text-right font-semibold">Estimated cost</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day, i) => (
            <tr key={day.id} className="border-t border-line">
              <th scope="row" className="py-2 pr-4 font-semibold whitespace-nowrap text-ink">
                Day {day.dayNumber}
              </th>
              <td className="py-2 pr-4 whitespace-nowrap text-muted">{formatDayDate(day.date, 'short')}</td>
              <td className="hidden py-2 pr-4 text-ink sm:table-cell">{day.title}</td>
              <td className="py-2 text-right whitespace-nowrap text-ink tabular-nums">{money(dayCosts[i])}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line-strong">
            <th scope="row" className="py-2 pr-4 font-semibold text-ink">
              Total
            </th>
            <td className="py-2 pr-4" />
            <td className="hidden py-2 pr-4 sm:table-cell" />
            <td className="py-2 text-right font-semibold whitespace-nowrap text-ink tabular-nums">
              {money(estimatedCost)}
            </td>
          </tr>
        </tfoot>
      </table>
    </Card>
  )
}
