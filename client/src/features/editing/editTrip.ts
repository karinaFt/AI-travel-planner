import { tripSchema, type Activity, type Day, type Trip } from '@travel-planner/shared'

/** An activity as the user enters it: no ID, no currency. */
export type ActivityDraft = Omit<Activity, 'id' | 'currency'>

export type EditAction =
  | { type: 'add'; dayId: string; id: string; draft: ActivityDraft }
  /** `dayId` is the day the activity should end up on; another day moves it there. */
  | { type: 'update'; activityId: string; dayId: string; draft: ActivityDraft }
  | { type: 'delete'; activityId: string }

/** Stable, so activities with the same start time keep their order. `HH:mm` strings compare as times. */
const byStartTime = (activities: readonly Activity[]) =>
  activities.toSorted((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))

/**
 * Applies one edit to a trip. New IDs come with the action, so this stays pure. Added and edited
 * activities always get the trip currency. When the action points at an unknown ID, or the result
 * would not pass `tripSchema`, the same `trip` object is returned, so nothing re-renders or saves.
 */
export function editTrip(trip: Trip, action: EditAction): Trip {
  const days = applyToDays(trip, action)
  if (!days) return trip
  const next: Trip = { ...trip, itinerary: { ...trip.itinerary, days } }
  return tripSchema.safeParse(next).success ? next : trip
}

function applyToDays(trip: Trip, action: EditAction): Day[] | undefined {
  const { days } = trip.itinerary
  const currency = trip.preferences.currency
  const withActivities = (day: Day, activities: Activity[]): Day => ({ ...day, activities })

  switch (action.type) {
    case 'add': {
      if (!days.some((day) => day.id === action.dayId)) return undefined
      const added: Activity = { ...action.draft, id: action.id, currency }
      return days.map((day) =>
        day.id === action.dayId ? withActivities(day, byStartTime([...day.activities, added])) : day,
      )
    }
    case 'update': {
      const source = days.find((day) => day.activities.some((activity) => activity.id === action.activityId))
      if (!source || !days.some((day) => day.id === action.dayId)) return undefined
      const updated: Activity = { ...action.draft, id: action.activityId, currency }

      if (source.id === action.dayId) {
        // Replaced in place, so an unchanged start time keeps its place among equal times.
        const activities = source.activities.map((activity) => (activity.id === action.activityId ? updated : activity))
        return days.map((day) => (day === source ? withActivities(day, byStartTime(activities)) : day))
      }
      // Moved: appended to the target day, so it lands after activities with the same start time.
      return days.map((day) => {
        if (day === source) return withActivities(day, day.activities.filter((a) => a.id !== action.activityId))
        if (day.id === action.dayId) return withActivities(day, byStartTime([...day.activities, updated]))
        return day
      })
    }
    case 'delete': {
      const source = days.find((day) => day.activities.some((activity) => activity.id === action.activityId))
      if (!source) return undefined
      return days.map((day) =>
        day === source ? withActivities(day, day.activities.filter((a) => a.id !== action.activityId)) : day,
      )
    }
  }
}
