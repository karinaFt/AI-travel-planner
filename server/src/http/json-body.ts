import express, { type RequestHandler } from 'express'
import { AppError } from './errors.ts'

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH'])
const parseJson = express.json({ limit: '10kb' })

/** Accepts only JSON bodies (415 otherwise), then parses them with a 10 KB limit. */
export const jsonBody: RequestHandler = (req, res, next) => {
  const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined
  if (BODY_METHODS.has(req.method) && hasBody && !req.is('application/json')) {
    next(new AppError('UNSUPPORTED_MEDIA_TYPE'))
    return
  }
  parseJson(req, res, next)
}
