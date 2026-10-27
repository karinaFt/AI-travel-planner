import { describe, expect, it } from 'vitest'
import { ERROR_CODES, apiErrorBodySchema } from './api.ts'

const valid = {
  error: { code: 'NOT_FOUND', message: 'This API route does not exist.', requestId: 'abc-123' },
}

describe('ERROR_CODES', () => {
  it('gives every code an error status and a non-empty message', () => {
    for (const [code, { status, message }] of Object.entries(ERROR_CODES)) {
      expect(status, code).toBeGreaterThanOrEqual(400)
      expect(status, code).toBeLessThan(600)
      expect(message.trim(), code).not.toBe('')
    }
  })
})

describe('apiErrorBodySchema', () => {
  it('accepts a valid envelope, with or without details', () => {
    expect(apiErrorBodySchema.parse(valid)).toEqual(valid)
    const withDetails = { error: { ...valid.error, details: { fields: ['destination'] } } }
    expect(apiErrorBodySchema.parse(withDetails)).toEqual(withDetails)
  })

  it('rejects an envelope without a code', () => {
    const { code: _code, ...rest } = valid.error
    expect(apiErrorBodySchema.safeParse({ error: rest }).success).toBe(false)
  })

  it('rejects an unknown code', () => {
    expect(apiErrorBodySchema.safeParse({ error: { ...valid.error, code: 'TEAPOT' } }).success).toBe(false)
  })

  it('rejects a body that is not an envelope', () => {
    expect(apiErrorBodySchema.safeParse({ message: 'nope' }).success).toBe(false)
    expect(apiErrorBodySchema.safeParse(null).success).toBe(false)
  })
})
