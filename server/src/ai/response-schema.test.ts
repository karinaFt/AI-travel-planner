import { describe, expect, it } from 'vitest'
import { aiItinerarySchema, responseJsonSchema } from './response-schema.ts'

describe('responseJsonSchema', () => {
  it('fixes the number of days', () => {
    const { days } = responseJsonSchema(4).properties
    expect(days.minItems).toBe(4)
    expect(days.maxItems).toBe(4)
  })

  it('keeps its fields in sync with the Zod schema the server validates with', () => {
    const { days } = responseJsonSchema(1).properties
    const zodDay = aiItinerarySchema.shape.days.element
    const zodActivity = zodDay.shape.activities.element

    expect(Object.keys(responseJsonSchema(1).properties)).toEqual(Object.keys(aiItinerarySchema.shape))
    expect(Object.keys(days.items.properties)).toEqual(Object.keys(zodDay.shape))
    expect(Object.keys(days.items.properties.activities.items.properties)).toEqual(Object.keys(zodActivity.shape))
    // Every field is required, so the model can't leave one out.
    expect(days.items.required).toEqual(Object.keys(zodDay.shape))
    expect(days.items.properties.activities.items.required).toEqual(Object.keys(zodActivity.shape))
  })

  it('uses only keywords Gemini supports', () => {
    const json = JSON.stringify(responseJsonSchema(3))
    for (const unsupported of ['pattern', 'minLength', 'maxLength', '$schema', 'additionalProperties']) {
      expect(json).not.toContain(`"${unsupported}"`)
    }
  })
})
