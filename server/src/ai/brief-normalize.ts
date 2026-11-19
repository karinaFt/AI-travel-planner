import {
  DAY_BRIEF_LIMITS,
  SINGLE_BLOCK_TYPES,
  dayBriefBlockSchema,
  type DayBriefBlock,
  type RouteStep,
} from '@travel-planner/shared'
import { AppError } from '../http/errors.ts'
import { aiBlockSchema, aiBriefSchema, type AiBlock } from './brief-response-schema.ts'

const invalidResponse = () => new AppError('AI_INVALID_RESPONSE')

/** Activity key (`a1`) → activity UUID. */
export type KeyMap = ReadonlyMap<string, string>

const keyOf = (key: string) => key.trim().toLowerCase()

/** All keys mapped, or undefined when any of them is unknown. */
function mapKeys(keys: readonly string[] | undefined, keyMap: KeyMap): string[] | undefined {
  const ids: string[] = []
  for (const key of keys ?? []) {
    const id = keyMap.get(keyOf(key))
    if (!id) return undefined
    if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

/** Route steps with known, distinct ends; the others are dropped. */
function mapSteps(steps: AiBlock['steps'], keyMap: KeyMap): RouteStep[] {
  const mapped: RouteStep[] = []
  for (const step of steps ?? []) {
    const fromActivityId = keyMap.get(keyOf(step.from))
    const toActivityId = keyMap.get(keyOf(step.to))
    if (!fromActivityId || !toActivityId || fromActivityId === toActivityId) continue
    mapped.push({
      fromActivityId,
      toActivityId,
      mode: step.mode.trim().toLowerCase() as RouteStep['mode'],
      ...(step.minutes !== undefined && { minutes: step.minutes }),
      note: step.note ?? '',
    })
  }
  return mapped
}

/** The typed candidate for one model block, or undefined when its keys don't fit the day. */
function toCandidate(block: AiBlock, keyMap: KeyMap): unknown {
  const type = block.type.trim()
  if (type === 'route') {
    return { type, steps: mapSteps(block.steps, keyMap) }
  }
  const activityIds = mapKeys(block.activityKeys, keyMap)
  if (!activityIds) return undefined
  switch (type) {
    case 'highlight': {
      const place = block.place?.trim()
      return { type, title: block.title, text: block.text, ...(place && { place }), activityIds }
    }
    case 'tip':
    case 'booking':
      return { type, text: block.text, activityIds }
    case 'budgetNote':
      return { type, text: block.text }
    default:
      return undefined
  }
}

/**
 * Turns the model's JSON text into blocks for the day. Each block is checked on its own: one with an
 * unknown key, a failed schema check, or a repeat of a type allowed once is dropped. Throws
 * `AI_INVALID_RESPONSE` when the outer shape is wrong or no block is left.
 */
export function normalizeBrief(text: string, keyMap: KeyMap): DayBriefBlock[] {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw invalidResponse()
  }
  const parsed = aiBriefSchema.safeParse(json)
  if (!parsed.success) throw invalidResponse()

  const blocks: DayBriefBlock[] = []
  for (const raw of parsed.data.blocks) {
    if (blocks.length === DAY_BRIEF_LIMITS.blocks.max) break
    const block = aiBlockSchema.safeParse(raw)
    if (!block.success) continue
    const candidate = dayBriefBlockSchema.safeParse(toCandidate(block.data, keyMap))
    if (!candidate.success) continue
    const { type } = candidate.data
    if (SINGLE_BLOCK_TYPES.includes(type) && blocks.some((kept) => kept.type === type)) continue
    blocks.push(candidate.data)
  }
  if (blocks.length === 0) throw invalidResponse()
  return blocks
}
