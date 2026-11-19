import type { DayBriefRequest } from '@travel-planner/shared'

/** Test data for brief tests. */
export const IDS = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
] as const

export const lisbonDay: DayBriefRequest = {
  destination: 'Lisbon',
  currency: 'EUR',
  travelers: 2,
  travelStyle: 'food',
  pace: 'balanced',
  interests: ['wine'],
  day: { dayNumber: 2, date: '2026-11-11', title: 'Belém and the river' },
  activities: [
    { id: IDS[0], title: 'Belém Tower', category: 'sightseeing', startTime: '09:30', durationMinutes: 90, estimatedCost: 24, description: 'Fortress on the river.' },
    { id: IDS[1], title: 'Pastéis de Belém', category: 'food', startTime: '11:15', durationMinutes: 45, estimatedCost: 12, description: '' },
    { id: IDS[2], title: 'Fado dinner', category: 'nightlife', startTime: '20:00', durationMinutes: 150, estimatedCost: 90, description: 'Live music.' },
  ],
}

/** A model answer with one block of every type, referring to activities by key. */
export const goodAnswer = {
  blocks: [
    { type: 'highlight', title: 'River and pastries', text: 'A day by the Tagus.', place: 'Belém Tower', activityKeys: ['a1'] },
    {
      type: 'route',
      steps: [
        { from: 'a1', to: 'a2', mode: 'walk', minutes: 10, note: 'Along the river.' },
        { from: 'a2', to: 'a3', mode: 'transit', minutes: 30, note: 'Tram 15 to the centre.' },
      ],
    },
    { type: 'tip', text: 'Eat them warm with cinnamon.', activityKeys: ['a2'] },
    { type: 'booking', text: 'Fado houses fill up; reserve a table.', activityKeys: ['a3'] },
    { type: 'budgetNote', text: 'Dinner is most of the day.' },
  ],
}
