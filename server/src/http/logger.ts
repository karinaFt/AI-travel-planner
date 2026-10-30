import type { RequestHandler } from 'express'

export type Logger = (entry: Record<string, unknown>) => void

/** Writes one JSON object per line. Tests pass their own `write` to collect lines. */
export function createLogger(write: (line: string) => void = (line) => process.stdout.write(line + '\n')): Logger {
  return (entry) => write(JSON.stringify({ time: new Date().toISOString(), ...entry }))
}

/** Logs one line per request when the response finishes. Never logs bodies or query strings. */
export function requestLogger(log: Logger): RequestHandler {
  return (req, res, next) => {
    const started = performance.now()
    const { method, path } = req
    res.on('finish', () => {
      const { requestId, errorCode } = res.locals
      log({
        method,
        path,
        status: res.statusCode,
        ms: Math.round(performance.now() - started),
        requestId,
        ...(errorCode && { code: errorCode }),
      })
    })
    next()
  }
}
