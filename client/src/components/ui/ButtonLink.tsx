import { Link, type LinkProps } from 'react-router'
import { buttonStyles, type ButtonSize, type ButtonVariant } from './buttonStyles.ts'

type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/** A navigation link that looks like a button. */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonStyles({ variant, size, className })} {...props} />
}
