import type { HTMLAttributes } from 'react'
import { cx } from './cx.ts'

/**
 * The page's top-level heading. It is focusable from script (tabIndex -1) so the
 * layout can move focus to it after navigation; it stays out of the Tab order.
 */
export function PageHeading({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      tabIndex={-1}
      className={cx('text-3xl text-ink focus:outline-none sm:text-4xl', className)}
      {...props}
    />
  )
}
