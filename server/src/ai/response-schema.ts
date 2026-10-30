import { ACTIVITY_CATEGORIES, ACTIVITY_LIMITS, START_TIME } from '@travel-planner/shared'
import { z } from 'zod'

/** Activities the model may return per day. Tighter than the shared per-day limit, which leaves room to edit. */
export const AI_ACTIVITIES_PER_DAY = { min: 1, max: 8 } as const

/** `9:30` → `09:30`; anything else is left for the pattern to judge. */
const padHour = (time: string) => (/^\d:\d\d$/.test(time) ? `0${time}` : time)

/**
 * What the model returns: content only. Lenient where the server normalizes afterwards (category, text
 * length); unknown keys such as an invented `id`, `date` or `currency` are stripped.
 */
export const aiItinerarySchema = z.object({
  days: z.array(
    z.object({
      title: z.string(),
      activities: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          category: z.string(),
          startTime: z.string().trim().transform(padHour).pipe(z.string().regex(START_TIME)),
          durationMinutes: z.number(),
          estimatedCost: z.number().min(0),
        }),
      ),
    }),
  ),
})

export type AiItinerary = z.output<typeof aiItinerarySchema>

/**
 * JSON Schema sent with the request, within Gemini's supported subset: no `pattern` and no length limits
 * (they are ignored). `minItems` = `maxItems` fixes the number of days.
 */
export function responseJsonSchema(dayCount: number) {
  return {
    type: 'object',
    properties: {
      days: {
        type: 'array',
        minItems: dayCount,
        maxItems: dayCount,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short title for the day' },
            activities: {
              type: 'array',
              minItems: AI_ACTIVITIES_PER_DAY.min,
              maxItems: AI_ACTIVITIES_PER_DAY.max,
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Short activity name' },
                  description: { type: 'string', description: '1–3 sentences' },
                  category: { type: 'string', enum: [...ACTIVITY_CATEGORIES] },
                  startTime: { type: 'string', description: 'Start time, 24-hour HH:mm, for example 09:30' },
                  durationMinutes: {
                    type: 'integer',
                    minimum: ACTIVITY_LIMITS.durationMinutes.min,
                    maximum: ACTIVITY_LIMITS.durationMinutes.max,
                  },
                  estimatedCost: {
                    type: 'number',
                    minimum: 0,
                    description: 'Cost for the whole group in the trip currency; 0 if free',
                  },
                },
                required: ['title', 'description', 'category', 'startTime', 'durationMinutes', 'estimatedCost'],
              },
            },
          },
          required: ['title', 'activities'],
        },
      },
    },
    required: ['days'],
  }
}
