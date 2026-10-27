import type { ComponentProps } from 'react'
import { inputStyles } from './inputStyles.ts'

type TextInputProps = Omit<ComponentProps<'input'>, 'type'> & { type?: 'text' | 'search' }

export function TextInput({ className, type = 'text', ...props }: TextInputProps) {
  return (
    <input type={type} className={inputStyles(props['aria-invalid'] === true, className)} {...props} />
  )
}
