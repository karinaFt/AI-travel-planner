import { subtractMoney } from '@travel-planner/shared'

export type BudgetSummaryData = {
  budget: number
  estimatedCost: number
  /** `within` includes exactly on budget. */
  status: 'within' | 'over'
  /** What remains when within, the excess when over; never negative. */
  difference: number
  /** Whole percent of the budget used, e.g. 8 or 120; not capped at 100. */
  percentUsed: number
}

const hundredths = (amount: number) => Math.round(amount * 100)

/** How the estimated cost compares with the budget, both in the trip currency. The budget is above 0. */
export function budgetSummary(budget: number, estimatedCost: number): BudgetSummaryData {
  const difference = subtractMoney(budget, estimatedCost)
  return {
    budget,
    estimatedCost,
    status: difference < 0 ? 'over' : 'within',
    difference: Math.abs(difference),
    // From hundredths, so float noise in the amounts can't tip the rounding.
    percentUsed: Math.round((hundredths(estimatedCost) * 100) / hundredths(budget)),
  }
}
