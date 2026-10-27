import { zodResolver } from '@hookform/resolvers/zod'
import { CURRENCIES, CURRENCY_NAMES, type TripPreferences } from '@travel-planner/shared'
import { format } from 'date-fns'
import { useEffect, useState, type Ref } from 'react'
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { Button } from '../../components/ui/Button.tsx'
import { DateInput } from '../../components/ui/DateInput.tsx'
import { Field } from '../../components/ui/Field.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { TextInput } from '../../components/ui/TextInput.tsx'
import { emptyTripPreferencesForm, tripPreferencesFormSchema, type TripPreferencesFormValues } from './formSchema.ts'
import { InterestsField } from './InterestsField.tsx'
import { PaceField, TravelStyleField } from './StyleFields.tsx'

type TripPreferencesFormProps = {
  onSubmit: (preferences: TripPreferences) => void
  /** Values to start from, e.g. a saved draft. */
  initialValues?: TripPreferencesFormValues
  /** Called with all raw values after every change, e.g. to keep a draft. */
  onValuesChange?: (values: TripPreferencesFormValues) => void
  /** Receives the destination input, so the page can focus it when returning to the form. */
  destinationRef?: Ref<HTMLInputElement>
}

const sectionClass = 'flex flex-col gap-5 border-0 p-0'
// A <legend> is not a flex item of its fieldset, so it needs its own bottom margin.
const legendClass = 'mb-4 font-display text-xl text-ink'

/** First message of a list field: its own error, or the first per-item error. */
function listError(error: FieldErrors<TripPreferencesFormValues>['interests']) {
  if (!error) return undefined
  if (error.message) return error.message
  // Per-item errors are stored under numeric keys ("0", "1", ...).
  const items = error as unknown as Record<string, { message?: string } | undefined>
  return Object.keys(items)
    .filter((key) => /^\d+$/.test(key))
    .map((key) => items[key]?.message)
    .find(Boolean)
}

export function TripPreferencesForm({
  onSubmit,
  initialValues = emptyTripPreferencesForm,
  onValuesChange,
  destinationRef,
}: TripPreferencesFormProps) {
  const {
    register,
    handleSubmit,
    trigger,
    control,
    getFieldState,
    subscribe,
    formState: { errors, isSubmitted },
  } = useForm<TripPreferencesFormValues, unknown, TripPreferences>({
    resolver: zodResolver(tripPreferencesFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: initialValues,
  })

  // Report every change without re-rendering the form on each keystroke.
  useEffect(() => {
    if (!onValuesChange) return
    return subscribe({
      formState: { values: true },
      callback: ({ values }) => onValuesChange(values),
    })
  }, [subscribe, onValuesChange])

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
        <Field
          label="Starting from (optional)"
          hint="Where your trip begins, e.g. Kyiv. Used to plan arrival and departure days"
          error={errors.origin?.message}
        >
          {(control) => <TextInput {...control} {...register('origin')} autoComplete="off" />}
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
            hint="For the trip at your destination; getting there and back isn't included. Use a dot for decimals, e.g. 1500.50"
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

      <fieldset className={sectionClass}>
        <legend className={legendClass}>Your style</legend>
        <TravelStyleField inputProps={register('travelStyle')} error={errors.travelStyle?.message} />
        <PaceField inputProps={register('pace')} error={errors.pace?.message} />
        <Controller
          control={control}
          name="interests"
          render={({ field }) => (
            <InterestsField value={field.value} onChange={field.onChange} error={listError(errors.interests)} />
          )}
        />
      </fieldset>

      <div>
        <Button type="submit" size="lg">
          Review trip
        </Button>
      </div>
    </form>
  )
}
