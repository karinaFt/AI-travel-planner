import { apiErrorBodySchema } from '@travel-planner/shared'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app.ts'
import { loadConfig } from '../config.ts'
import { createLogger } from '../http/logger.ts'

const CLIENT = '203.0.113.7'

function app(env: Record<string, string>) {
  const lines: string[] = []
  return { lines, app: createApp({ config: loadConfig(env), log: createLogger((line) => lines.push(line)) }) }
}

describe('GET /api/client-ip', () => {
  it('does not exist unless EXPOSE_CLIENT_IP is true', async () => {
    const response = await request(app({}).app).get('/api/client-ip')
    expect(response.status).toBe(404)
    expect(apiErrorBodySchema.parse(response.body).error.code).toBe('NOT_FOUND')
  })

  it('returns the address the server uses, honoring TRUST_PROXY, without logging it', async () => {
    const { app: trusting, lines } = app({ EXPOSE_CLIENT_IP: 'true', TRUST_PROXY: '1' })
    const response = await request(trusting).get('/api/client-ip').set('X-Forwarded-For', CLIENT)
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { ip: CLIENT } })
    expect(lines.join('\n')).not.toContain(CLIENT)
  })

  it('ignores X-Forwarded-For when no proxy is trusted', async () => {
    const response = await request(app({ EXPOSE_CLIENT_IP: 'true' }).app)
      .get('/api/client-ip')
      .set('X-Forwarded-For', CLIENT)
    expect(response.body.data.ip).not.toBe(CLIENT)
  })
})
