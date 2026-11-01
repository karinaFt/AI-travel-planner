import { describe, expect, it } from 'vitest'
import { ACTIVITY_MESSAGES, activityFormSchema, activityValues, newActivityValues, type ActivityFormValues } from './activityFormSchema.ts'

const DAY_ID = '00000000-0000-4000-8000-000000000100'

const values = (overrides: Partial<ActivityFormValues> = {}): ActivityFormValues => ({
  title: 'Tram 28',
  dayId: DAY_ID,
  startTime: '10:00',
  durationMinutes: '30',
  category: 'transport',
  estimatedCost: '3',
  description: '',
  ...overrides,
})

/** The messages of a failed parse by field. */
const errors = (input: ActivityFormValues) => {
  const result = activityFormSchema.safeParse(input)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]))
}

describe('activityFormSchema', () => {
  it('turns valid values into a day and a draft with numbers and trimmed text', () => {
    expect(
      activityFormSchema.parse(
        values({ title: '  Tram 28 ', estimatedCost: ' 3.50 ', durationMinutes: '30', description: ' Ride it. ' }),
      ),
    ).toEqual({
      dayId: DAY_ID,
      draft: {
        title: 'Tram 28',
        startTime: '10:00',
        durationMinutes: 30,
        category: 'transport',
        estimatedCost: 3.5,
        description: 'Ride it.',
      },
    })
  })

  it('accepts a cost of 0 and the duration limits', () => {
    expect(activityFormSchema.safeParse(values({ estimatedCost: '0', durationMinutes: '5' })).success).toBe(true)
    expect(activityFormSchema.safeParse(values({ estimatedCost: '10000000', durationMinutes: '1440' })).success).toBe(
      true,
    )
  })

  it.each<[string, Partial<ActivityFormValues>, string, string]>([
    ['an empty title', { title: '   ' }, 'title', ACTIVITY_MESSAGES.titleRequired],
    ['a long title', { title: 'x'.repeat(121) }, 'title', ACTIVITY_MESSAGES.titleLength],
    ['no day', { dayId: '' }, 'dayId', ACTIVITY_MESSAGES.day],
    ['25:00', { startTime: '25:00' }, 'startTime', ACTIVITY_MESSAGES.startTime],
    ['9:30', { startTime: '9:30' }, 'startTime', ACTIVITY_MESSAGES.startTime],
    ['a short duration', { durationMinutes: '3' }, 'durationMinutes', ACTIVITY_MESSAGES.duration],
    ['a long duration', { durationMinutes: '1441' }, 'durationMinutes', ACTIVITY_MESSAGES.duration],
    ['a fractional duration', { durationMinutes: '30.5' }, 'durationMinutes', ACTIVITY_MESSAGES.duration],
    ['an unknown category', { category: 'flights' }, 'category', ACTIVITY_MESSAGES.category],
    ['3 decimals', { estimatedCost: '12.345' }, 'estimatedCost', ACTIVITY_MESSAGES.costDecimals],
    ['a huge cost', { estimatedCost: '10000000.01' }, 'estimatedCost', ACTIVITY_MESSAGES.costMax],
    ['an empty cost', { estimatedCost: '' }, 'estimatedCost', ACTIVITY_MESSAGES.costFormat],
    ['a long description', { description: 'x'.repeat(1001) }, 'description', ACTIVITY_MESSAGES.descriptionLength],
  ])('rejects %s', (_, overrides, field, message) => {
    expect(errors(values(overrides))).toEqual({ [field]: message })
  })

  it.each(['abc', '1e3', '-1', '12,5', '+3'])('rejects %s as a cost or a duration', (text) => {
    expect(errors(values({ estimatedCost: text }))).toEqual({ estimatedCost: ACTIVITY_MESSAGES.costFormat })
    expect(errors(values({ durationMinutes: text }))).toEqual({ durationMinutes: ACTIVITY_MESSAGES.duration })
  })
})

describe('form starting values', () => {
  it('starts a new activity on the given day with category Other and 60 minutes', () => {
    expect(newActivityValues(DAY_ID)).toEqual({
      title: '',
      dayId: DAY_ID,
      startTime: '',
      durationMinutes: '60',
      category: 'other',
      estimatedCost: '',
      description: '',
    })
  })

  it('fills in an existing activity as text', () => {
    expect(
      activityValues(
        {
          id: '00000000-0000-4000-8000-000000000200',
          title: 'Lunch',
          description: 'Fish.',
          category: 'food',
          startTime: '13:00',
          durationMinutes: 90,
          estimatedCost: 25.5,
          currency: 'EUR',
        },
        DAY_ID,
      ),
    ).toEqual({
      title: 'Lunch',
      dayId: DAY_ID,
      startTime: '13:00',
      durationMinutes: '90',
      category: 'food',
      estimatedCost: '25.5',
      description: 'Fish.',
    })
  })
})
