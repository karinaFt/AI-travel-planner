import type { ComponentProps } from 'react'
import { inputStyles } from './inputStyles.ts'

/** Native date picker; its value is always YYYY-MM-DD or an empty string. */
export function DateInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <input type="date" className={inputStyles(props['aria-invalid'] === true, className)} {...props} />
  )
}
