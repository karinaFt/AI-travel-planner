import type { Pace, TravelStyle } from '@travel-planner/shared'
import type { RadioCardOption } from '../../components/ui/RadioCardGroup.tsx'

// UI copy for the shared enums. The activity counts match the generation prompt.

export const TRAVEL_STYLE_OPTIONS: ReadonlyArray<RadioCardOption & { value: TravelStyle }> = [
  { value: 'relaxation', title: 'Relaxation', description: 'Slow mornings, spas, beaches' },
  { value: 'adventure', title: 'Adventure', description: 'Hikes, sports, adrenaline' },
  { value: 'culture', title: 'Culture', description: 'Museums, history, architecture' },
  { value: 'food', title: 'Food', description: 'Markets, local dishes, tastings' },
  { value: 'nature', title: 'Nature', description: 'Parks, views, outdoors' },
]

export const PACE_OPTIONS: ReadonlyArray<RadioCardOption & { value: Pace }> = [
  { value: 'relaxed', title: 'Relaxed', description: '2–3 activities a day' },
  { value: 'balanced', title: 'Balanced', description: '3–5 activities a day' },
  { value: 'packed', title: 'Packed', description: '5–7 activities a day' },
]

export function travelStyleTitle(value: TravelStyle) {
  return TRAVEL_STYLE_OPTIONS.find((option) => option.value === value)?.title ?? value
}

export function paceTitle(value: Pace) {
  return PACE_OPTIONS.find((option) => option.value === value)?.title ?? value
}
