import type { ApiSuccess } from '@travel-planner/shared'
import { Router } from 'express'

/**
 * GET /client-ip: the caller's address as the rate limits see it, with the configured `TRUST_PROXY`.
 * Mounted only when `EXPOSE_CLIENT_IP=true`, to check the proxy count once after deploying. Never logged.
 */
export const clientIpRouter = Router()

clientIpRouter.get('/client-ip', (req, res) => {
  const body: ApiSuccess<{ ip: string | undefined }> = { data: { ip: req.ip } }
  res.json(body)
})
