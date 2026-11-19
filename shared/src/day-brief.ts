import { z } from 'zod'

/** Block types the model may choose from, in no particular order. */
export const DAY_BRIEF_BLOCK_TYPES = ['highlight', 'route', 'tip', 'booking', 'budgetNote'] as const
export type DayBriefBlockType = (typeof DAY_BRIEF_BLOCK_TYPES)[number]

/** Types a brief may hold at most once. */
export const SINGLE_BLOCK_TYPES: readonly DayBriefBlockType[] = ['highlight', 'route', 'budgetNote']

export const ROUTE_MODES = ['walk', 'transit', 'taxi', 'other'] as const
export type RouteMode = (typeof ROUTE_MODES)[number]

export const DAY_BRIEF_LIMITS = {
  blocks: { min: 1, max: 5 },
  title: { max: 80 },
  highlightText: { max: 400 },
  place: { max: 100 },
  text: { max: 240 },
  routeSteps: { min: 1, max: 19 },
  minutes: { min: 1, max: 240 },
  note: { max: 140 },
} as const

/** Photo thumbnails come only from Wikimedia's media hosts (the API now serves thumbnails from `thumb.`). */
export const PHOTO_ORIGINS = ['https://upload.wikimedia.org', 'https://thumb.wikimedia.org'] as const

/** True for a URL on one of the photo hosts. */
export const isPhotoUrl = (url: string) => PHOTO_ORIGINS.some((origin) => url.startsWith(`${origin}/`))
/** The photo's file page on Wikimedia Commons, which carries the author and license. */
export const PHOTO_SOURCE_PREFIX = 'https://commons.wikimedia.org/wiki/File:'

const text = (max: number) => z.string().trim().min(1).max(max)
const activityIds = (min: number, max: number) => z.array(z.uuid()).min(min).max(max)
const urlStartingWith = (prefix: string) => z.url().refine((url) => url.startsWith(prefix), `Must start with ${prefix}`)

export const highlightBlockSchema = z.object({
  type: z.literal('highlight'),
  title: text(DAY_BRIEF_LIMITS.title.max),
  text: text(DAY_BRIEF_LIMITS.highlightText.max),
  place: text(DAY_BRIEF_LIMITS.place.max).optional(),
  activityIds: activityIds(0, 1),
  image: z
    .object({
      url: z.url().refine(isPhotoUrl, 'Must be a Wikimedia image URL'),
      sourceUrl: urlStartingWith(PHOTO_SOURCE_PREFIX),
    })
    .optional(),
})

export const routeStepSchema = z.object({
  fromActivityId: z.uuid(),
  toActivityId: z.uuid(),
  mode: z.enum(ROUTE_MODES),
  minutes: z.number().int().min(DAY_BRIEF_LIMITS.minutes.min).max(DAY_BRIEF_LIMITS.minutes.max).optional(),
  note: z.string().trim().max(DAY_BRIEF_LIMITS.note.max),
})

export const routeBlockSchema = z.object({
  type: z.literal('route'),
  steps: z.array(routeStepSchema).min(DAY_BRIEF_LIMITS.routeSteps.min).max(DAY_BRIEF_LIMITS.routeSteps.max),
})

export const tipBlockSchema = z.object({
  type: z.literal('tip'),
  text: text(DAY_BRIEF_LIMITS.text.max),
  activityIds: activityIds(0, 3),
})

export const bookingBlockSchema = z.object({
  type: z.literal('booking'),
  text: text(DAY_BRIEF_LIMITS.text.max),
  activityIds: activityIds(1, 3),
})

export const budgetNoteBlockSchema = z.object({
  type: z.literal('budgetNote'),
  text: text(DAY_BRIEF_LIMITS.text.max),
})

export const dayBriefBlockSchema = z.discriminatedUnion('type', [
  highlightBlockSchema,
  routeBlockSchema,
  tipBlockSchema,
  bookingBlockSchema,
  budgetNoteBlockSchema,
])

const blocksSchema = z
  .array(dayBriefBlockSchema)
  .min(DAY_BRIEF_LIMITS.blocks.min)
  .max(DAY_BRIEF_LIMITS.blocks.max)
  .refine(
    (blocks) => SINGLE_BLOCK_TYPES.every((type) => blocks.filter((block) => block.type === type).length <= 1),
    'Highlight, route and budget note may appear at most once',
  )

/**
 * What the API returns. Activity IDs are not checked against the day: a saved overview may refer to
 * activities deleted since, and that must not make the saved trip invalid.
 */
export const dayBriefResultSchema = z.object({
  blocks: blocksSchema,
  generatedAt: z.iso.datetime(),
})

/** A day overview as saved on the day. `basedOn` is the signature of the activities it was made from. */
export const dayBriefSchema = dayBriefResultSchema.extend({
  basedOn: z.string().min(1),
  /** Titles of the activities it was made from, so a reference to a deleted activity can still be named. */
  activityTitles: z.record(z.uuid(), z.string().max(120)).optional(),
})

export type DayBriefBlock = z.output<typeof dayBriefBlockSchema>
export type HighlightBlock = z.output<typeof highlightBlockSchema>
export type RouteBlock = z.output<typeof routeBlockSchema>
export type RouteStep = z.output<typeof routeStepSchema>
export type TipBlock = z.output<typeof tipBlockSchema>
export type BookingBlock = z.output<typeof bookingBlockSchema>
export type BudgetNoteBlock = z.output<typeof budgetNoteBlockSchema>
export type DayBriefResult = z.output<typeof dayBriefResultSchema>
export type DayBrief = z.output<typeof dayBriefSchema>
