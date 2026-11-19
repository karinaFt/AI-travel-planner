import { describe, expect, it } from 'vitest'
import { AppError } from '../http/errors.ts'
import { normalizeBrief } from './brief-normalize.ts'
import { IDS, goodAnswer } from './brief-test-data.ts'

const keyMap = new Map([
  ['a1', IDS[0]],
  ['a2', IDS[1]],
  ['a3', IDS[2]],
])

const normalize = (answer: unknown) => normalizeBrief(JSON.stringify(answer), keyMap)

function expectInvalid(run: () => unknown) {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe('AI_INVALID_RESPONSE')
    return
  }
  throw new Error('Expected AI_INVALID_RESPONSE')
}

describe('normalizeBrief', () => {
  it('maps keys to activity IDs and keeps the model order', () => {
    const blocks = normalize(goodAnswer)
    expect(blocks.map((b) => b.type)).toEqual(['highlight', 'route', 'tip', 'booking', 'budgetNote'])
    expect(blocks[0]).toEqual({
      type: 'highlight',
      title: 'River and pastries',
      text: 'A day by the Tagus.',
      place: 'Belém Tower',
      activityIds: [IDS[0]],
    })
    expect(blocks[1]).toEqual({
      type: 'route',
      steps: [
        { fromActivityId: IDS[0], toActivityId: IDS[1], mode: 'walk', minutes: 10, note: 'Along the river.' },
        { fromActivityId: IDS[1], toActivityId: IDS[2], mode: 'transit', minutes: 30, note: 'Tram 15 to the centre.' },
      ],
    })
    expect(blocks[3]).toEqual({ type: 'booking', text: 'Fado houses fill up; reserve a table.', activityIds: [IDS[2]] })
  })

  it('accepts keys in another case or with spaces', () => {
    const blocks = normalize({ blocks: [{ type: 'tip', text: 'Go early.', activityKeys: [' A2 '] }] })
    expect(blocks[0]).toMatchObject({ activityIds: [IDS[1]] })
  })

  it('drops only the block with an unknown key', () => {
    const blocks = normalize({
      blocks: [goodAnswer.blocks[0], { type: 'tip', text: 'Bad key.', activityKeys: ['a9'] }, goodAnswer.blocks[3]],
    })
    expect(blocks.map((b) => b.type)).toEqual(['highlight', 'booking'])
  })

  it('drops a block that fails the block schema', () => {
    const blocks = normalize({
      blocks: [
        { type: 'tip', text: 'x'.repeat(241), activityKeys: [] },
        { type: 'booking', text: 'No activities.', activityKeys: [] },
        { type: 'map', text: 'Unknown type.' },
        { type: 'tip' },
        'not an object',
        goodAnswer.blocks[4],
      ],
    })
    expect(blocks.map((b) => b.type)).toEqual(['budgetNote'])
  })

  it('drops route steps with unknown or repeated ends, and a route left empty', () => {
    const route = normalize({
      blocks: [
        {
          type: 'route',
          steps: [
            { from: 'a1', to: 'a9', mode: 'walk', note: '' },
            { from: 'a2', to: 'a2', mode: 'walk', note: '' },
            { from: 'a2', to: 'a3', mode: 'taxi', note: 'Quick.' },
          ],
        },
      ],
    })
    expect(route).toEqual([
      { type: 'route', steps: [{ fromActivityId: IDS[1], toActivityId: IDS[2], mode: 'taxi', note: 'Quick.' }] },
    ])

    const empty = normalize({ blocks: [{ type: 'route', steps: [{ from: 'a1', to: 'a9', mode: 'walk' }] }, goodAnswer.blocks[2]] })
    expect(empty.map((b) => b.type)).toEqual(['tip'])
  })

  it('drops a route step with an unknown mode by dropping the route', () => {
    const blocks = normalize({ blocks: [{ type: 'route', steps: [{ from: 'a1', to: 'a2', mode: 'boat' }] }, goodAnswer.blocks[2]] })
    expect(blocks.map((b) => b.type)).toEqual(['tip'])
  })

  it('keeps only the first highlight, route and budget note', () => {
    const second = { ...goodAnswer.blocks[0], title: 'Second' }
    const blocks = normalize({ blocks: [goodAnswer.blocks[0], second, goodAnswer.blocks[4], goodAnswer.blocks[4]] })
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ title: 'River and pastries' })
  })

  it('keeps at most 5 blocks', () => {
    const tip = goodAnswer.blocks[2]
    expect(normalize({ blocks: [tip, tip, tip, tip, tip, tip, tip] })).toHaveLength(5)
  })

  it('drops a blank place', () => {
    const [block] = normalize({ blocks: [{ ...goodAnswer.blocks[0], place: '  ' }] })
    expect(block).not.toHaveProperty('place')
  })

  it('fails when the answer is not JSON, has the wrong shape, or leaves no block', () => {
    expectInvalid(() => normalizeBrief('Sure! Here is the overview', keyMap))
    expectInvalid(() => normalize({ days: [] }))
    expectInvalid(() => normalize({ blocks: [] }))
    expectInvalid(() => normalize({ blocks: [{ type: 'tip', text: 'Bad key.', activityKeys: ['a9'] }] }))
  })
})
