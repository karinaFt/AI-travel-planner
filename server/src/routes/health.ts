import type { ApiSuccess } from '@travel-planner/shared'
import { Router } from 'express'

export const healthRouter = Router()

healthRouter.get('/health', (_req, res) => {
  const body: ApiSuccess<{ status: 'ok' }> = { data: { status: 'ok' } }
  res.json(body)
})
