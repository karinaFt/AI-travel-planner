import { format, parseISO } from 'date-fns'

/** "2026-11-10" → "10 Nov 2026" */
export function formatDate(isoDate: string) {
  return format(parseISO(isoDate), 'd MMM yyyy')
}

/** Amount in the given ISO currency, e.g. "€1,500.00" or "UAH 12,000.50". */
export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount)
}

/** "1 day", "3 days" */
export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}
