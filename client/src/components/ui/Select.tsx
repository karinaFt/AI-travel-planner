import type { ComponentProps } from 'react'
import { cx } from './cx.ts'
import { inputStyles } from './inputStyles.ts'

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={inputStyles(props['aria-invalid'] === true, cx('appearance-none pr-10', className))}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 fill-muted"
      >
        <path d="M3.5 6 8 10.5 12.5 6l1 1L8 12.5 2.5 7l1-1Z" />
      </svg>
    </div>
  )
}
