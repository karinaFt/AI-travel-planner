import { useId, type ComponentProps } from 'react'
import { cx } from './cx.ts'

export type RadioCardOption = {
  value: string
  title: string
  description: string
}

type RadioCardGroupProps = {
  legend: string
  options: readonly RadioCardOption[]
  error?: string
  className?: string
  /** Props for every radio input, e.g. the result of React Hook Form's `register(name)`. */
  inputProps: Omit<ComponentProps<'input'>, 'type' | 'value' | 'id'>
}

/**
 * A group of selectable cards built on native radio inputs, so the browser
 * provides arrow-key navigation, a single Tab stop and screen reader support.
 */
export function RadioCardGroup({ legend, options, error, className, inputProps }: RadioCardGroupProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      className={cx('flex flex-col gap-2 border-0 p-0', className)}
    >
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const optionId = `${id}-${option.value}`
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cx(
                'flex cursor-pointer flex-col gap-1 rounded-xl border bg-surface px-4 py-3',
                'transition-[border-color,background-color] duration-150 motion-reduce:transition-none',
                'hover:border-ink/60 has-[:checked]:border-primary has-[:checked]:bg-mint',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
                error ? 'border-coral-text' : 'border-line-strong',
              )}
            >
              <input
                {...inputProps}
                id={optionId}
                type="radio"
                value={option.value}
                aria-invalid={error ? true : undefined}
                // Name from the title only; the description is announced separately.
                aria-labelledby={`${optionId}-title`}
                aria-describedby={`${optionId}-description`}
                className="sr-only"
              />
              <span id={`${optionId}-title`} className="font-semibold text-ink">
                {option.title}
              </span>
              <span id={`${optionId}-description`} className="text-sm text-muted">
                {option.description}
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-coral-text">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 fill-current">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 3.5h1.5v5h-1.5v-5Zm0 6.5h1.5v1.5h-1.5V11Z" />
          </svg>
          {error}
        </p>
      )}
    </fieldset>
  )
}
