import type { DayBriefBlock, DayBriefRequest, DayBriefResult } from '@travel-planner/shared'
import type { FindPhoto } from '../photos/wikipedia.ts'
import { activityKey, buildBriefPrompt } from './brief-prompt.ts'
import { normalizeBrief } from './brief-normalize.ts'
import { briefResponseJsonSchema } from './brief-response-schema.ts'
import { callModel } from './generate.ts'
import type { ItineraryModel } from './model.ts'

export type GenerateBriefOptions = {
  /** Fires on timeout or client disconnect; the call then rejects with `AI_TIMEOUT`. */
  signal?: AbortSignal
  findPhoto: FindPhoto
  now?: () => Date
}

/** Adds a photo to the highlight when one is found; any other block is returned as is. */
async function withPhoto(
  block: DayBriefBlock,
  destination: string,
  findPhoto: FindPhoto,
  signal?: AbortSignal,
): Promise<DayBriefBlock> {
  if (block.type !== 'highlight' || !block.place) return block
  const image = await findPhoto(block.place, destination, signal)
  return image ? { ...block, image } : block
}

/** One AI call, no retry: prompt → model → blocks checked one by one → photo for the highlight. */
export async function generateBrief(
  request: DayBriefRequest,
  model: ItineraryModel,
  { signal, findPhoto, now = () => new Date() }: GenerateBriefOptions,
): Promise<DayBriefResult> {
  const { systemInstruction, contents } = buildBriefPrompt(request)
  const text = await callModel(model, { systemInstruction, contents, responseJsonSchema: briefResponseJsonSchema() }, signal)
  const keyMap = new Map(request.activities.map((activity, index) => [activityKey(index), activity.id]))
  const blocks = normalizeBrief(text, keyMap)
  return {
    blocks: await Promise.all(blocks.map((block) => withPhoto(block, request.destination, findPhoto, signal))),
    generatedAt: now().toISOString(),
  }
}
