import type { ButtonHTMLAttributes, Ref } from 'react'
import { buttonStyles, type ButtonSize, type ButtonVariant } from './buttonStyles.ts'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  ref?: Ref<HTMLButtonElement>
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />
}
