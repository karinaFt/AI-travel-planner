import { cx } from './cx.ts'

/** Shared look for text inputs, date inputs and selects. */
export function inputStyles(invalid = false, className?: string) {
  return cx(
    'block w-full rounded-xl border bg-surface px-4 py-3 text-base text-ink placeholder:text-muted/70',
    'transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none',
    'focus-visible:outline-2 focus-visible:outline-offset-1',
    invalid
      ? 'border-coral-text shadow-[0_0_0_1px_var(--color-coral-text)] focus-visible:outline-coral-text'
      : 'border-line-strong hover:border-ink/60 focus-visible:outline-primary',
    className,
  )
}
