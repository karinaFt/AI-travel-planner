import { afterEach, describe, expect, it, vi } from 'vitest'
import { jsonResponse, mockFetch } from '../test/fetchMock.ts'
import { warmUp } from './warmUp.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('warmUp', () => {
  it('sends one GET /api/health that bypasses the cache', () => {
    const fetchMock = mockFetch(async () => jsonResponse(200, { data: { status: 'ok' } }))
    warmUp()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/health', { cache: 'no-store' })
  })

  it('swallows a failed request', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })

    expect(() => warmUp()).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 0))
    process.off('unhandledRejection', unhandled)
    expect(unhandled).not.toHaveBeenCalled()
  })
})
