import { zodResolver } from '@hookform/resolvers/zod'
import { ACTIVITY_CATEGORIES, ACTIVITY_LIMITS, type Day } from '@travel-planner/shared'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button.tsx'
import { Field } from '../../components/ui/Field.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { TextArea } from '../../components/ui/TextArea.tsx'
import { TextInput } from '../../components/ui/TextInput.tsx'
import { categoryLabel, formatDayDate } from '../itinerary/format.ts'
import { activityFormSchema, type ActivityFormOutput, type ActivityFormValues } from './activityFormSchema.ts'

type ActivityFormProps = {
  mode: 'add' | 'edit'
  /** The form's accessible name, e.g. "Edit Lunch". */
  label: string
  initialValues: ActivityFormValues
  days: readonly Day[]
  currency: string
  onSubmit: (output: ActivityFormOutput) => void
  onCancel: () => void
}

/** Adds or edits one activity. Focuses its title on mount; every field is validated like the trip schema. */
export function ActivityForm({ mode, label, initialValues, days, currency, onSubmit, onCancel }: ActivityFormProps) {
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<ActivityFormValues, unknown, ActivityFormOutput>({
    resolver: zodResolver(activityFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: initialValues,
  })

  useEffect(() => {
    setFocus('title')
  }, [setFocus])

  // The activity's own day always stays selectable, even when it is full.
  const isFull = (day: Day) => day.id !== initialValues.dayId && day.activities.length >= ACTIVITY_LIMITS.perDay.max

  return (
    <form
      noValidate
      aria-label={label}
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 rounded-xl bg-canvas p-4 ring-1 ring-line sm:p-5"
    >
      <Field label="Title" error={errors.title?.message}>
        {(control) => <TextInput {...control} {...register('title')} autoComplete="off" />}
      </Field>
      <Field label="Day" error={errors.dayId?.message}>
        {(control) => (
          <Select {...control} {...register('dayId')}>
            {days.map((day) => (
              <option key={day.id} value={day.id} disabled={isFull(day)}>
                Day {day.dayNumber} · {formatDayDate(day.date, 'short')}
                {isFull(day) ? ' (full)' : ''}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Start time" hint="24-hour, e.g. 09:30" error={errors.startTime?.message}>
          {(control) => <TextInput {...control} {...register('startTime')} inputMode="numeric" autoComplete="off" />}
        </Field>
        <Field label="Duration in minutes" error={errors.durationMinutes?.message}>
          {(control) => (
            <TextInput {...control} {...register('durationMinutes')} inputMode="numeric" autoComplete="off" />
          )}
        </Field>
        <Field label={`Estimated cost (${currency})`} hint="For the whole group" error={errors.estimatedCost?.message}>
          {(control) => <TextInput {...control} {...register('estimatedCost')} inputMode="decimal" autoComplete="off" />}
        </Field>
      </div>
      <Field label="Category" error={errors.category?.message}>
        {(control) => (
          <Select {...control} {...register('category')}>
            {ACTIVITY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Description (optional)" error={errors.description?.message}>
        {(control) => <TextArea {...control} {...register('description')} />}
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{mode === 'add' ? 'Add activity' : 'Save activity'}</Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
