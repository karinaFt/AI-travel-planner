import { DAY_BRIEF_BLOCK_TYPES, DAY_BRIEF_LIMITS, ROUTE_MODES } from '@travel-planner/shared'
import { z } from 'zod'

/**
 * What the model returns: only the outer shape is checked here. Each block is judged on its own
 * afterwards (`normalizeBrief`), so one bad block doesn't lose the others.
 */
export const aiBriefSchema = z.object({
  blocks: z.array(z.unknown()),
})

/** One block as the model writes it, before keys are mapped. Lenient: anything off just drops the block. */
export const aiBlockSchema = z.object({
  type: z.string(),
  title: z.string().optional(),
  text: z.string().optional(),
  place: z.string().optional(),
  activityKeys: z.array(z.string()).optional(),
  steps: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        mode: z.string(),
        minutes: z.number().optional(),
        note: z.string().optional(),
      }),
    )
    .optional(),
})

export type AiBlock = z.output<typeof aiBlockSchema>

/**
 * JSON Schema sent with the request, in Gemini's supported subset: one flat block object with `type` as
 * an enum and every other field optional (no `anyOf`, no length limits).
 */
export function briefResponseJsonSchema() {
  return {
    type: 'object',
    properties: {
      blocks: {
        type: 'array',
        minItems: DAY_BRIEF_LIMITS.blocks.min,
        maxItems: DAY_BRIEF_LIMITS.blocks.max,
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: [...DAY_BRIEF_BLOCK_TYPES] },
            title: { type: 'string', description: 'highlight only: short title for the day' },
            text: { type: 'string', description: 'The block text' },
            place: { type: 'string', description: 'highlight only: a real, well-known place from the activities' },
            activityKeys: { type: 'array', items: { type: 'string' }, description: 'Activity keys such as a1' },
            steps: {
              type: 'array',
              description: 'route only: one step per pair of consecutive activities',
              items: {
                type: 'object',
                properties: {
                  from: { type: 'string', description: 'Activity key' },
                  to: { type: 'string', description: 'Activity key' },
                  mode: { type: 'string', enum: [...ROUTE_MODES] },
                  minutes: {
                    type: 'integer',
                    minimum: DAY_BRIEF_LIMITS.minutes.min,
                    maximum: DAY_BRIEF_LIMITS.minutes.max,
                  },
                  note: { type: 'string' },
                },
                required: ['from', 'to', 'mode'],
              },
            },
          },
          required: ['type'],
        },
      },
    },
    required: ['blocks'],
  }
}
