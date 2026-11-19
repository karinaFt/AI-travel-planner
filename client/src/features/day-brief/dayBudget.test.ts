import type { Activity } from '@travel-planner/shared'
import { describe, expect, it } from 'vitest'
import { dayBudget } from './dayBudget.ts'

let n = 0
const activity = (title: string, estimatedCost: number): Activity => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  title,
  description: '',
  category: 'other',
  startTime: '10:00',
  durationMinutes: 60,
  estimatedCost,
  currency: 'EUR',
})

describe('dayBudget', () => {
  it('lists paid activities most expensive first with whole-percent shares, and counts free ones', () => {
    const budget = dayBudget([activity('Museum', 15), activity('Park', 0), activity('Dinner', 45), activity('Tram', 40)])
    expect(budget.rows.map(({ title, amount, percent }) => [title, amount, percent])).toEqual([
      ['Dinner', 45, 45],
      ['Tram', 40, 40],
      ['Museum', 15, 15],
    ])
    expect(budget.freeCount).toBe(1)
    expect(budget.total).toBe(100)
  })

  it('keeps the order of equal costs', () => {
    const budget = dayBudget([activity('A', 10), activity('B', 10)])
    expect(budget.rows.map((row) => row.title)).toEqual(['A', 'B'])
  })

  it('rounds shares, which may not add up to 100', () => {
    const budget = dayBudget([activity('A', 1), activity('B', 1), activity('C', 1)])
    expect(budget.rows.map((row) => row.percent)).toEqual([33, 33, 33])
  })

  it('sums exactly', () => {
    expect(dayBudget([activity('A', 0.1), activity('B', 0.2)]).total).toBe(0.3)
  })

  it('has no rows when everything is free', () => {
    expect(dayBudget([activity('Walk', 0)])).toEqual({ rows: [], freeCount: 1, total: 0 })
  })
})
