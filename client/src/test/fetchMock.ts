import { ERROR_CODES, type ApiErrorCode } from '@travel-planner/shared'
import { vi } from 'vitest'

type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** Replaces the global `fetch` for one test; undo with `vi.unstubAllGlobals()`. */
export function mockFetch(impl: FetchImpl) {
  const fetchMock = vi.fn<FetchImpl>(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

/** The API's error envelope for `code`, with its real status and message. */
export function apiErrorResponse(code: ApiErrorCode, headers: Record<string, string> = {}) {
  const { status, message } = ERROR_CODES[code]
  return jsonResponse(status, { error: { code, message, requestId: 'test-request-id' } }, headers)
}

/** A fetch that never answers on its own and rejects like the browser once its signal aborts. */
export const hangingFetch: FetchImpl = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')))
  })

/** The JSON body a mocked fetch call was made with. */
export function requestBody(fetchMock: ReturnType<typeof mockFetch>, call = 0) {
  return JSON.parse(String(fetchMock.mock.calls[call][1]?.body))
}
