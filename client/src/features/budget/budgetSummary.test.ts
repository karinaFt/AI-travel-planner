import { sumMoney } from '@travel-planner/shared'
import { describe, expect, it } from 'vitest'
import { budgetSummary } from './budgetSummary.ts'

describe('budgetSummary', () => {
  it('shows what remains within the budget', () => {
    expect(budgetSummary(1500, 120)).toEqual({
      budget: 1500,
      estimatedCost: 120,
      status: 'within',
      difference: 1380,
      percentUsed: 8,
    })
  })

  it('counts exactly on budget as within', () => {
    expect(budgetSummary(120, 120)).toMatchObject({ status: 'within', difference: 0, percentUsed: 100 })
  })

  it('shows the excess over the budget', () => {
    expect(budgetSummary(100, 120)).toMatchObject({ status: 'over', difference: 20, percentUsed: 120 })
  })

  it('compares decimal amounts exactly', () => {
    expect(budgetSummary(0.3, sumMoney([0.1, 0.2]))).toMatchObject({ status: 'within', difference: 0, percentUsed: 100 })
    expect(budgetSummary(0.3, 0.1 + 0.2)).toMatchObject({ status: 'within', difference: 0 })
    expect(budgetSummary(1500, 1379.99)).toMatchObject({ status: 'within', difference: 120.01 })
  })

  it('rounds the share of the budget to a whole percent', () => {
    expect(budgetSummary(1500, 0).percentUsed).toBe(0)
    expect(budgetSummary(3, 1).percentUsed).toBe(33)
    expect(budgetSummary(3, 2).percentUsed).toBe(67)
  })
})
