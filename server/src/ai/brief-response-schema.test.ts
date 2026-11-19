import { describe, expect, it } from 'vitest'
import { briefResponseJsonSchema } from './brief-response-schema.ts'

describe('briefResponseJsonSchema', () => {
  const schema = briefResponseJsonSchema()
  const blocks = schema.properties.blocks

  it('asks for 1 to 5 flat blocks with a type enum', () => {
    expect(blocks.minItems).toBe(1)
    expect(blocks.maxItems).toBe(5)
    expect(blocks.items.properties.type.enum).toEqual(['highlight', 'route', 'tip', 'booking', 'budgetNote'])
    expect(blocks.items.required).toEqual(['type'])
  })

  it('stays within the Gemini subset: no anyOf, patterns or length limits', () => {
    const text = JSON.stringify(schema)
    for (const keyword of ['anyOf', 'oneOf', 'pattern', 'maxLength', 'minLength']) {
      expect(text).not.toContain(`"${keyword}"`)
    }
  })

  it('limits route modes', () => {
    expect(blocks.items.properties.steps.items.properties.mode.enum).toEqual(['walk', 'transit', 'taxi', 'other'])
  })
})
