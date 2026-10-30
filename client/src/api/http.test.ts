import { ERROR_CODES } from '@travel-planner/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiErrorResponse, hangingFetch, jsonResponse, mockFetch } from '../test/fetchMock.ts'
import { postJson } from './http.ts'

const parseName = (body: unknown) => {
  const name = (body as { data?: { name?: unknown } } | null)?.data?.name
  if (typeof name !== 'string') throw new Error('bad body')
  return name
}

const post = (signal?: AbortSignal) => postJson('/api/test', { a: 1 }, { signal, timeoutMs: 1000, parse: parseName })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('postJson', () => {
  it('POSTs JSON to the path and parses a success body', async () => {
    const fetchMock = mockFetch(async () => jsonResponse(200, { data: { name: 'ok' } }))
    await expect(post()).resolves.toEqual({ ok: true, data: 'ok' })

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/test')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(init?.body).toBe('{"a":1}')
  })

  it.each([
    ['a body that fails parsing', () => jsonResponse(200, { data: {} })],
    ['a non-JSON body', () => new Response('<html>', { status: 200 })],
  ])('turns %s into invalid-response', async (_, response) => {
    mockFetch(async () => response())
    await expect(post()).resolves.toEqual({ ok: false, error: { kind: 'invalid-response' } })
  })

  it('returns the error envelope with its code, message and Retry-After', async () => {
    mockFetch(async () => apiErrorResponse('RATE_LIMITED', { 'Retry-After': '40' }))
    await expect(post()).resolves.toEqual({
      ok: false,
      error: { kind: 'api', code: 'RATE_LIMITED', message: ERROR_CODES.RATE_LIMITED.message, retryAfterSeconds: 40 },
    })
  })

  it('ignores a Retry-After that is not whole seconds', async () => {
    mockFetch(async () => apiErrorResponse('RATE_LIMITED', { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }))
    const result = await post()
    expect(result.ok === false && result.error).toEqual({
      kind: 'api',
      code: 'RATE_LIMITED',
      message: ERROR_CODES.RATE_LIMITED.message,
    })
  })

  it('treats an error status without the envelope as INTERNAL_ERROR', async () => {
    mockFetch(async () => new Response('Bad gateway', { status: 502 }))
    await expect(post()).resolves.toEqual({
      ok: false,
      error: { kind: 'api', code: 'INTERNAL_ERROR', message: ERROR_CODES.INTERNAL_ERROR.message },
    })
  })

  it('reports a rejected fetch as a network failure', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(post()).resolves.toEqual({ ok: false, error: { kind: 'network' } })
  })

  it("reports the caller's abort as cancelled and aborts the fetch", async () => {
    const fetchMock = mockFetch(hangingFetch)
    const controller = new AbortController()
    const result = post(controller.signal)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    controller.abort()
    await expect(result).resolves.toEqual({ ok: false, error: { kind: 'cancelled' } })
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
  })

  it('does not call fetch when the signal is already aborted', async () => {
    const fetchMock = mockFetch(hangingFetch)
    const controller = new AbortController()
    controller.abort()
    await expect(post(controller.signal)).resolves.toEqual({ ok: false, error: { kind: 'cancelled' } })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('aborts the fetch and reports a timeout when the time limit runs out', async () => {
    vi.useFakeTimers()
    const fetchMock = mockFetch(hangingFetch)
    const result = post()
    await vi.advanceTimersByTimeAsync(999)
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await expect(result).resolves.toEqual({ ok: false, error: { kind: 'timeout' } })
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
  })
})
