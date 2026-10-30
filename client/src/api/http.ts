import { ERROR_CODES, apiErrorBodySchema, type ApiErrorCode } from '@travel-planner/shared'

/** Every way a request can fail, so UI code never handles raw `fetch` errors. */
export type ApiFailure =
  /** The API answered with an error; `message` is safe to show. */
  | { kind: 'api'; code: ApiErrorCode; message: string; retryAfterSeconds?: number }
  /** The server could not be reached. */
  | { kind: 'network' }
  /** Our own time limit ran out. */
  | { kind: 'timeout' }
  /** The caller aborted the request. */
  | { kind: 'cancelled' }
  /** A success status with a body we can't use. */
  | { kind: 'invalid-response' }

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure }

export type PostJsonOptions<T> = {
  signal?: AbortSignal
  timeoutMs: number
  /** Turns the success body into `T`; throwing makes the result `invalid-response`. */
  parse: (body: unknown) => T
}

const failure = (error: ApiFailure) => ({ ok: false, error }) as const

/** `Retry-After` in whole seconds; the HTTP-date form is not used by our API. */
function retryAfterSeconds(header: string | null) {
  if (header === null || !/^\d+$/.test(header.trim())) return undefined
  return Number(header.trim())
}

/**
 * POSTs `body` as JSON to a same-origin API path. Never throws: every outcome, including a timeout and the
 * caller's abort, comes back as an `ApiResult`.
 */
export async function postJson<T>(
  path: string,
  body: unknown,
  { signal, timeoutMs, parse }: PostJsonOptions<T>,
): Promise<ApiResult<T>> {
  if (signal?.aborted) return failure({ kind: 'cancelled' })

  // One controller for both abort sources; `reason` records which one fired first.
  const controller = new AbortController()
  let reason: 'cancelled' | 'timeout' | undefined
  const onCancel = () => {
    reason ??= 'cancelled'
    controller.abort()
  }
  signal?.addEventListener('abort', onCancel, { once: true })
  const timer = setTimeout(() => {
    reason ??= 'timeout'
    controller.abort()
  }, timeoutMs)

  try {
    let response: Response
    try {
      response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch {
      return failure({ kind: reason ?? 'network' })
    }

    let json: unknown
    try {
      json = await response.json()
    } catch {
      json = undefined
    }
    if (reason) return failure({ kind: reason })

    if (response.ok) {
      try {
        return { ok: true, data: parse(json) }
      } catch {
        return failure({ kind: 'invalid-response' })
      }
    }

    const envelope = apiErrorBodySchema.safeParse(json)
    if (!envelope.success) {
      return failure({ kind: 'api', code: 'INTERNAL_ERROR', message: ERROR_CODES.INTERNAL_ERROR.message })
    }
    const { code, message } = envelope.data.error
    const retryAfter = retryAfterSeconds(response.headers.get('Retry-After'))
    return failure({ kind: 'api', code, message, ...(retryAfter !== undefined && { retryAfterSeconds: retryAfter }) })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onCancel)
  }
}
