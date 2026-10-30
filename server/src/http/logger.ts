import type { RequestHandler } from 'express'

export type Logger = (entry: Record<string, unknown>) => void

/** Writes one JSON object per line. Tests pass their own `write` to collect lines. */
export function createLogger(write: (line: string) => void = (line) => process.stdout.write(line + '\n')): Logger {
  return (entry) => write(JSON.stringify({ time: new Date().toISOString(), ...entry }))
}

/**
 * Logs one line per request: when the response finishes, or with `aborted: true` (and no status) when the
 * client goes away first. Never logs bodies or query strings.
 */
export function requestLogger(log: Logger): RequestHandler {
  return (req, res, next) => {
    const started = performance.now()
    const { method, path } = req
    let logged = false
    const logOnce = (outcome: { status: number } | { aborted: true }) => {
      if (logged) return
      logged = true
      const { requestId, errorCode } = res.locals
      log({
        method,
        path,
        ...outcome,
        ms: Math.round(performance.now() - started),
        requestId,
        ...(errorCode && { code: errorCode }),
      })
    }
    res.on('finish', () => logOnce({ status: res.statusCode }))
    // `close` also follows a normal `finish`; only an unfinished response counts as abandoned.
    res.on('close', () => {
      if (!res.writableFinished) logOnce({ aborted: true })
    })
    next()
  }
}
