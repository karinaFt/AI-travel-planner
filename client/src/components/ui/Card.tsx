import type { HTMLAttributes } from 'react'
import { cx } from './cx.ts'

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'article' | 'li'
}

export function Card({ as: Element = 'div', className, ...props }: CardProps) {
  return (
    <Element
      className={cx(
        'rounded-card border border-line bg-surface p-6 shadow-card sm:p-8',
        className,
      )}
      {...props}
    />
  )
}
