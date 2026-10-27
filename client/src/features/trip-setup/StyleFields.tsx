import type { ComponentProps } from 'react'
import { RadioCardGroup } from '../../components/ui/RadioCardGroup.tsx'
import { PACE_OPTIONS, TRAVEL_STYLE_OPTIONS } from './styleOptions.ts'

type StyleFieldProps = {
  /** Props for each radio input, e.g. React Hook Form's `register(name)`. */
  inputProps: Omit<ComponentProps<'input'>, 'type' | 'value' | 'id'>
  error?: string
}

export function TravelStyleField({ inputProps, error }: StyleFieldProps) {
  return (
    <RadioCardGroup
      legend="Travel style"
      options={TRAVEL_STYLE_OPTIONS}
      inputProps={inputProps}
      error={error}
    />
  )
}

export function PaceField({ inputProps, error }: StyleFieldProps) {
  return <RadioCardGroup legend="Pace" options={PACE_OPTIONS} inputProps={inputProps} error={error} />
}
