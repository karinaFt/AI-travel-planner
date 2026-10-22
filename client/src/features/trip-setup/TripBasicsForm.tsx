import { zodResolver } from '@hookform/resolvers/zod'
import { CURRENCIES, CURRENCY_NAMES, type TripBasics } from '@travel-planner/shared'
import { format } from 'date-fns'
import { useState, type Ref } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '../../components/ui/Button.tsx'
import { DateInput } from '../../components/ui/DateInput.tsx'
import { Field } from '../../components/ui/Field.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { TextInput } from '../../components/ui/TextInput.tsx'
import { emptyTripBasicsForm, tripBasicsFormSchema, type TripBasicsFormValues } from './formSchema.ts'

type TripBasicsFormProps = {
  onSubmit: (basics: TripBasics) => void
  /** Receives the destination input, so the page can focus it when returning to the form. */
  destinationRef?: Ref<HTMLInputElement>
}

const sectionClass = 'flex flex-col gap-5 border-0 p-0'
// A <legend> is not a flex item of its fieldset, so it needs its own bottom margin.
const legendClass = 'mb-4 font-display text-xl text-ink'

export function TripBasicsForm({ onSubmit, destinationRef }: TripBasicsFormProps) {
  const {
    register,
    handleSubmit,
    trigger,
    control,
    getFieldState,
    formState: { errors, isSubmitted },
  } = useForm<TripBasicsFormValues, unknown, TripBasics>({
    resolver: zodResolver(tripBasicsFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: emptyTripBasicsForm,
  })

  // Read the clock once per form instance, not on every render.
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const startDate = useWatch({ control, name: 'startDate' })

  const destination = register('destination')
  const startDateField = register('startDate', {
    // "End before start" depends on both dates: re-check the end date once it is in play.
    onChange: () => {
      if (isSubmitted || getFieldState('endDate').isTouched) {
        void trigger('endDate')
      }
    },
  })

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-10">
      <fieldset className={sectionClass}>
        <legend className={legendClass}>Where &amp; when</legend>
        <Field label="Destination" error={errors.destination?.message}>
          {(control) => (
            <TextInput
              {...control}
              {...destination}
              ref={(element) => {
                destination.ref(element)
                if (typeof destinationRef === 'function') destinationRef(element)
                else if (destinationRef) destinationRef.current = element
              }}
              autoComplete="off"
              placeholder="e.g. Lisbon, Portugal"
            />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Start date" error={errors.startDate?.message}>
            {(control) => <DateInput {...control} {...startDateField} min={today} />}
          </Field>
          <Field label="End date" error={errors.endDate?.message}>
            {(control) => <DateInput {...control} {...register('endDate')} min={startDate || today} />}
          </Field>
        </div>
      </fieldset>

      <fieldset className={sectionClass}>
        <legend className={legendClass}>Budget &amp; travelers</legend>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]">
          <Field
            label="Total budget"
            hint="For the whole trip. Use a dot for decimals, e.g. 1500.50"
            error={errors.budget?.message}
          >
            {(control) => (
              <TextInput {...control} {...register('budget')} inputMode="decimal" autoComplete="off" />
            )}
          </Field>
          <Field label="Currency" error={errors.currency?.message}>
            {(control) => (
              <Select {...control} {...register('currency')}>
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code} — {CURRENCY_NAMES[code]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Number of travelers" error={errors.travelers?.message} className="sm:max-w-56">
          {(control) => (
            <TextInput {...control} {...register('travelers')} inputMode="numeric" autoComplete="off" />
          )}
        </Field>
      </fieldset>

      <div>
        <Button type="submit" size="lg">
          Continue
        </Button>
      </div>
    </form>
  )
}
