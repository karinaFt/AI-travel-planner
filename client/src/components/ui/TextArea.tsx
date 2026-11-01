import type { ComponentProps } from 'react'
import { inputStyles } from './inputStyles.ts'

export function TextArea({ className, rows = 3, ...props }: ComponentProps<'textarea'>) {
  return <textarea rows={rows} className={inputStyles(props['aria-invalid'] === true, className)} {...props} />
}
