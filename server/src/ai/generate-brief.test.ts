import { describe, expect, it, vi } from 'vitest'
import type { FindPhoto } from '../photos/wikipedia.ts'
import { goodAnswer, lisbonDay } from './brief-test-data.ts'
import { generateBrief } from './generate-brief.ts'
import type { ItineraryModel } from './model.ts'

const photo = {
  url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Tower.jpg',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tower.jpg',
}
const now = () => new Date('2026-11-09T10:00:00.000Z')
const model = (text: string): ItineraryModel => ({ generate: vi.fn(async () => text) })

describe('generateBrief', () => {
  it('sends the prompt and schema, and adds the photo to the highlight', async () => {
    const m = model(JSON.stringify(goodAnswer))
    const findPhoto = vi.fn<FindPhoto>(async () => photo)
    const result = await generateBrief(lisbonDay, m, { findPhoto, now })

    expect(result.generatedAt).toBe('2026-11-09T10:00:00.000Z')
    expect(result.blocks[0]).toMatchObject({ type: 'highlight', image: photo })
    expect(findPhoto).toHaveBeenCalledTimes(1)
    expect(findPhoto).toHaveBeenCalledWith('Belém Tower', 'Lisbon', undefined)

    const [request] = vi.mocked(m.generate).mock.calls[0]
    expect(request.contents).toContain('"key": "a1"')
    expect(request.responseJsonSchema).toHaveProperty('properties.blocks')
  })

  it('leaves the highlight without an image when no photo is found', async () => {
    const result = await generateBrief(lisbonDay, model(JSON.stringify(goodAnswer)), { findPhoto: async () => null, now })
    expect(result.blocks[0]).not.toHaveProperty('image')
  })

  it('does not look up a photo without a place', async () => {
    const answer = { blocks: [{ type: 'highlight', title: 'Day', text: 'Calm.', activityKeys: [] }] }
    const findPhoto = vi.fn<FindPhoto>(async () => photo)
    await generateBrief(lisbonDay, model(JSON.stringify(answer)), { findPhoto, now })
    expect(findPhoto).not.toHaveBeenCalled()
  })

  it('rejects with AI_TIMEOUT when the signal fires while the model is still working', async () => {
    const hanging: ItineraryModel = { generate: () => new Promise(() => {}) }
    const controller = new AbortController()
    const pending = generateBrief(lisbonDay, hanging, { findPhoto: async () => null, signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ code: 'AI_TIMEOUT' })
  })
})
