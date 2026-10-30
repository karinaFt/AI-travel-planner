/**
 * The exact sum of money amounts with at most 2 decimals. Adding in integer hundredths avoids
 * floating-point drift such as 0.1 + 0.2 = 0.30000000000000004.
 */
export function sumMoney(amounts: readonly number[]) {
  let hundredths = 0
  for (const amount of amounts) hundredths += Math.round(amount * 100)
  return hundredths / 100
}

/** The exact difference `a - b` of two money amounts with at most 2 decimals, via integer hundredths. */
export function subtractMoney(a: number, b: number) {
  return (Math.round(a * 100) - Math.round(b * 100)) / 100
}
