import { describe, expect, it } from 'vitest'
import { subtractMoney, sumMoney } from './money.ts'

describe('sumMoney', () => {
  it('is 0 for no amounts', () => {
    expect(sumMoney([])).toBe(0)
  })

  it('adds decimal amounts exactly', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
    expect(sumMoney([0.1, 0.2, 19.99])).toBe(20.29)
    expect(sumMoney([1.15, 2.3, 0.05])).toBe(3.5)
  })

  it('keeps 2 decimals for large amounts', () => {
    expect(sumMoney([9_999_999.99, 0.01])).toBe(10_000_000)
    expect(sumMoney([4_999_999.99, 4_999_999.99])).toBe(9_999_999.98)
  })
})

describe('subtractMoney', () => {
  it('subtracts decimal amounts exactly', () => {
    expect(subtractMoney(0.3, 0.1)).toBe(0.2)
    expect(subtractMoney(0.3, sumMoney([0.1, 0.2]))).toBe(0)
    expect(subtractMoney(1500, 120)).toBe(1380)
  })

  it('is negative when the second amount is larger', () => {
    expect(subtractMoney(100, 120)).toBe(-20)
    expect(subtractMoney(0.1, 0.3)).toBe(-0.2)
  })

  it('keeps 2 decimals for large amounts', () => {
    expect(subtractMoney(10_000_000, 0.01)).toBe(9_999_999.99)
  })
})
