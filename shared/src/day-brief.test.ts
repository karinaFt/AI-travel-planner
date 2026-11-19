import { describe, expect, it } from 'vitest'
import { activitySignature, dayBriefRequestSchema } from './day-brief-request.ts'
import type { Activity } from './itinerary.ts'
import { dayBriefBlockSchema, dayBriefResultSchema, dayBriefSchema } from './day-brief.ts'

const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'
const C = '00000000-0000-4000-8000-000000000003'
const D = '00000000-0000-4000-8000-000000000004'

const highlight = {
  type: 'highlight',
  title: 'Cathedrals and coffee',
  text: 'A slow morning in the old town.',
  place: 'Belém Tower',
  activityIds: [A],
  image: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Tower.jpg/800px-Tower.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tower.jpg',
  },
}
const route = { type: 'route', steps: [{ fromActivityId: A, toActivityId: B, mode: 'walk', minutes: 12, note: 'Downhill.' }] }
const tip = { type: 'tip', text: 'Go before noon.', activityIds: [B] }
const booking = { type: 'booking', text: 'Book tickets ahead.', activityIds: [C] }
const budgetNote = { type: 'budgetNote', text: 'Dinner is the big spend.' }

const valid = (block: unknown) => dayBriefBlockSchema.safeParse(block).success

describe('dayBriefBlockSchema', () => {
  it.each([highlight, route, tip, booking, budgetNote])('accepts a valid $type block', (block) => {
    expect(valid(block)).toBe(true)
  })

  it('accepts images from both Wikimedia media hosts, and nothing that only looks like one', () => {
    const withUrl = (url: string) => ({ ...highlight, image: { ...highlight.image, url } })
    expect(valid(withUrl('https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/T.jpg/960px-T.jpg'))).toBe(true)
    expect(valid(withUrl('https://upload.wikimedia.org.evil.example/a.jpg'))).toBe(false)
    expect(valid(withUrl('http://upload.wikimedia.org/a.jpg'))).toBe(false)
  })

  it('accepts a highlight without a place, activity or image, and a tip without activities', () => {
    expect(valid({ type: 'highlight', title: 'T', text: 'X', activityIds: [] })).toBe(true)
    expect(valid({ ...tip, activityIds: [] })).toBe(true)
  })

  it('trims text', () => {
    expect(dayBriefBlockSchema.parse({ ...tip, text: '  Go early.  ' })).toMatchObject({ text: 'Go early.' })
  })

  it.each([
    ['an unknown type', { type: 'map' }],
    ['an image on another host', { ...highlight, image: { ...highlight.image, url: 'https://example.com/a.jpg' } }],
    ['a source outside Commons file pages', { ...highlight, image: { ...highlight.image, sourceUrl: 'https://example.com/' } }],
    ['a highlight with two activities', { ...highlight, activityIds: [A, B] }],
    ['a title over 80 characters', { ...highlight, title: 'x'.repeat(81) }],
    ['highlight text over 400 characters', { ...highlight, text: 'x'.repeat(401) }],
    ['blank text', { ...tip, text: '   ' }],
    ['tip text over 240 characters', { ...tip, text: 'x'.repeat(241) }],
    ['a tip with four activities', { ...tip, activityIds: [A, B, C, D] }],
    ['a booking without activities', { ...booking, activityIds: [] }],
    ['a non-UUID activity ID', { ...tip, activityIds: ['a1'] }],
    ['a route without steps', { type: 'route', steps: [] }],
    ['an unknown route mode', { type: 'route', steps: [{ ...route.steps[0], mode: 'boat' }] }],
    ['route minutes over 240', { type: 'route', steps: [{ ...route.steps[0], minutes: 241 }] }],
    ['fractional route minutes', { type: 'route', steps: [{ ...route.steps[0], minutes: 1.5 }] }],
    ['a note over 140 characters', { type: 'route', steps: [{ ...route.steps[0], note: 'x'.repeat(141) }] }],
  ])('rejects %s', (_label, block) => {
    expect(valid(block)).toBe(false)
  })
})

describe('dayBriefSchema', () => {
  const brief = (blocks: unknown[]) => ({ blocks, basedOn: 'abcd1234', generatedAt: '2026-11-09T10:00:00.000Z' })

  it('accepts 1 to 5 blocks', () => {
    expect(dayBriefSchema.safeParse(brief([tip])).success).toBe(true)
    expect(dayBriefSchema.safeParse(brief([highlight, route, tip, booking, budgetNote])).success).toBe(true)
  })

  it('rejects no blocks or more than 5', () => {
    expect(dayBriefSchema.safeParse(brief([])).success).toBe(false)
    expect(dayBriefSchema.safeParse(brief([tip, tip, tip, booking, booking, budgetNote])).success).toBe(false)
  })

  it.each([highlight, route, budgetNote])('allows a $type block only once', (block) => {
    expect(dayBriefSchema.safeParse(brief([block, block])).success).toBe(false)
  })

  it('allows several tips and bookings', () => {
    expect(dayBriefSchema.safeParse(brief([tip, tip, booking, booking])).success).toBe(true)
  })

  it('accepts saved activity titles keyed by activity ID', () => {
    expect(dayBriefSchema.safeParse({ ...brief([tip]), activityTitles: { [A]: 'Castle' } }).success).toBe(true)
    expect(dayBriefSchema.safeParse({ ...brief([tip]), activityTitles: { a1: 'Castle' } }).success).toBe(false)
  })

  it('requires basedOn when saved, but not in the API result', () => {
    const { basedOn: _basedOn, ...result } = brief([tip])
    expect(dayBriefSchema.safeParse(result).success).toBe(false)
    expect(dayBriefResultSchema.safeParse(result).success).toBe(true)
  })
})

describe('dayBriefRequestSchema', () => {
  const activity = (id: string, overrides: Record<string, unknown> = {}) => ({
    id,
    title: 'Castle',
    category: 'sightseeing',
    startTime: '09:30',
    durationMinutes: 90,
    estimatedCost: 15,
    description: 'Views.',
    ...overrides,
  })
  const request = (overrides: Record<string, unknown> = {}) => ({
    destination: 'Lisbon',
    currency: 'EUR',
    travelers: 2,
    travelStyle: 'food',
    pace: 'balanced',
    interests: ['wine'],
    day: { dayNumber: 2, date: '2026-11-11', title: 'Old town' },
    activities: [activity(A), activity(B, { startTime: '11:00' })],
    ...overrides,
  })

  it('accepts a valid request', () => {
    expect(dayBriefRequestSchema.safeParse(request()).success).toBe(true)
  })

  it('accepts a 160-character description and rejects 161', () => {
    expect(dayBriefRequestSchema.safeParse(request({ activities: [activity(A, { description: 'x'.repeat(160) })] })).success).toBe(true)
    expect(dayBriefRequestSchema.safeParse(request({ activities: [activity(A, { description: 'x'.repeat(161) })] })).success).toBe(false)
  })

  it.each([
    ['no activities', { activities: [] }],
    ['21 activities', { activities: Array.from({ length: 21 }, (_, i) => activity(`00000000-0000-4000-8000-${String(i + 10).padStart(12, '0')}`)) }],
    ['duplicate activity IDs', { activities: [activity(A), activity(A)] }],
    ['an unknown currency', { currency: 'BTC' }],
    ['an invalid date', { day: { dayNumber: 1, date: '2026-02-30', title: 'X' } }],
  ])('rejects %s', (_label, overrides) => {
    expect(dayBriefRequestSchema.safeParse(request(overrides)).success).toBe(false)
  })
})

describe('activitySignature', () => {
  const base: Omit<Activity, 'currency'>[] = [
    { id: A, title: 'Castle', category: 'sightseeing', startTime: '09:30', durationMinutes: 90, estimatedCost: 15, description: 'x' },
    { id: B, title: 'Lunch', category: 'food', startTime: '12:00', durationMinutes: 60, estimatedCost: 30, description: 'y' },
  ]
  const sig = activitySignature(base)

  it('is a stable 8-character hex string', () => {
    expect(sig).toMatch(/^[0-9a-f]{8}$/)
    expect(activitySignature(base.map((a) => ({ ...a })))).toBe(sig)
  })

  it.each<[string, Partial<Activity>]>([
    ['title', { title: 'Fort' }],
    ['category', { category: 'culture' }],
    ['startTime', { startTime: '10:00' }],
    ['durationMinutes', { durationMinutes: 91 }],
    ['estimatedCost', { estimatedCost: 15.5 }],
    ['id', { id: C }],
  ])('changes with %s', (_field, change) => {
    expect(activitySignature([{ ...base[0], ...change }, base[1]])).not.toBe(sig)
  })

  it('changes when activities are added, removed or reordered', () => {
    expect(activitySignature([base[0]])).not.toBe(sig)
    expect(activitySignature([...base, { ...base[0], id: C }])).not.toBe(sig)
    expect(activitySignature([base[1], base[0]])).not.toBe(sig)
  })

  it('ignores the description', () => {
    expect(activitySignature([{ ...base[0], description: 'other' }, base[1]])).toBe(sig)
  })
})
