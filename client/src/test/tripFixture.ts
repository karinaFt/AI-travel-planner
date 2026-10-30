import { tripDates, tripSchema, type Activity, type Trip, type TripPreferences } from '@travel-planner/shared'

/** A valid v4-shaped UUID that is easy to read in failures. */
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export const fixturePreferences: TripPreferences = {
  destination: 'Lisbon',
  origin: 'Kyiv',
  startDate: '2026-11-10',
  endDate: '2026-11-12',
  budget: 1500,
  currency: 'EUR',
  travelers: 2,
  travelStyle: 'food',
  pace: 'relaxed',
  interests: ['wine', 'markets'],
}

/** An activity without the parts the fixture fills in: its ID and the trip currency. */
export type FixtureActivity = Omit<Activity, 'id' | 'currency'>

const lunch: FixtureActivity = {
  title: 'Lunch',
  description: '',
  category: 'food',
  startTime: '13:00',
  durationMinutes: 60,
  estimatedCost: 40,
}

/**
 * A trip that passes `tripSchema`: one day per date, each titled "Day title N". `days[i]` gives day i+1's
 * activities; days it doesn't cover get one "Lunch" at 13:00 for 40.
 */
export function tripFixture({
  id = uuid(1),
  preferences = fixturePreferences,
  days = [],
}: { id?: string; preferences?: TripPreferences; days?: ReadonlyArray<readonly FixtureActivity[]> } = {}): Trip {
  return tripSchema.parse({
    id,
    createdAt: '2026-10-30T10:00:00.000Z',
    preferences,
    itinerary: {
      days: tripDates(preferences.startDate, preferences.endDate).map((date, i) => ({
        id: uuid(100 + i),
        dayNumber: i + 1,
        date,
        title: `Day title ${i + 1}`,
        activities: (days[i] ?? [lunch]).map((activity, j) => ({
          ...activity,
          id: uuid(200 + i + j * 100),
          currency: preferences.currency,
        })),
      })),
    },
  })
}
