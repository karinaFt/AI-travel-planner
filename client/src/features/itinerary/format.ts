import type { ActivityCategory } from '@travel-planner/shared'
import { format, parseISO } from 'date-fns'

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  sightseeing: 'Sightseeing',
  culture: 'Culture',
  food: 'Food',
  nature: 'Nature',
  adventure: 'Adventure',
  relaxation: 'Relaxation',
  shopping: 'Shopping',
  nightlife: 'Nightlife',
  transport: 'Transport',
  other: 'Other',
}

export function categoryLabel(category: ActivityCategory) {
  return CATEGORY_LABELS[category]
}

/** 45 → "45 min", 90 → "1 h 30 min", 120 → "2 h" */
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

const MINUTES_PER_DAY = 24 * 60
const twoDigits = (n: number) => String(n).padStart(2, '0')

/** "13:00" for 90 min → "13:00–14:30"; past midnight → "23:30–01:00 (next day)". */
export function formatTimeRange(startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(':').map(Number)
  const end = hours * 60 + minutes + durationMinutes
  const endOfDay = end % MINUTES_PER_DAY
  const endTime = `${twoDigits(Math.floor(endOfDay / 60))}:${twoDigits(endOfDay % 60)}`
  // Durations are at most a day long, so an activity ends on the same day or the next one.
  return `${startTime}–${endTime}${end >= MINUTES_PER_DAY ? ' (next day)' : ''}`
}

/** "2026-11-11" → "Wed, 11 Nov" (short) or "Wednesday, 11 November" (long). */
export function formatDayDate(isoDate: string, style: 'short' | 'long') {
  return format(parseISO(isoDate), style === 'short' ? 'EEE, d MMM' : 'EEEE, d MMMM')
}
