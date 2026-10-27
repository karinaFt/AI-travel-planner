import { cx } from './cx.ts'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-pill font-semibold no-underline transition-[color,background-color,border-color,translate] duration-150 ease-out motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-surface shadow-card hover:bg-primary-hover hover:-translate-y-px motion-reduce:hover:translate-y-0',
  secondary: 'border border-line-strong bg-surface text-ink hover:border-primary hover:text-primary',
  ghost: 'text-primary underline-offset-4 hover:underline',
}

const sizes: Record<ButtonSize, string> = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cx(base, variants[variant], sizes[size], className)
}
