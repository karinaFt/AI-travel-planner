import { get, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { ERROR_CODES, apiErrorBodySchema } from '@travel-planner/shared'
import { Router } from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'
import { createLogger } from './http/logger.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const INTERNAL_DETAIL = 'connection refused at /srv/internal/db.ts'

let lines: string[]
let consoleError: ReturnType<typeof vi.spyOn>

function testApp() {
  const extraRoutes = Router()
  extraRoutes.post('/test/echo', (req, res) => {
    res.json({ data: req.body })
  })
  extraRoutes.get('/test/throw', () => {
    throw new Error(INTERNAL_DETAIL)
  })
  // Never answers, so the client has to give up.
  extraRoutes.get('/test/hang', () => {})
  return createApp({ config: loadConfig({}), log: createLogger((line) => lines.push(line)), extraRoutes })
}

/** Asserts the error envelope, its status and that the body's requestId matches the header. */
function expectError(response: request.Response, code: keyof typeof ERROR_CODES) {
  expect(response.status).toBe(ERROR_CODES[code].status)
  expect(response.headers['content-type']).toMatch(/^application\/json/)
  const { error } = apiErrorBodySchema.parse(response.body)
  expect(error.code).toBe(code)
  expect(error.message).toBe(ERROR_CODES[code].message)
  expect(error.requestId).toMatch(UUID)
  expect(response.headers['x-request-id']).toBe(error.requestId)
}

beforeEach(() => {
  lines = []
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleError.mockRestore()
})

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const response = await request(testApp()).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { status: 'ok' } })
  })

  it('sends security headers and no X-Powered-By', async () => {
    const response = await request(testApp()).get('/api/health')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers).not.toHaveProperty('x-powered-by')
  })
})

describe('error envelope', () => {
  it('returns 404 NOT_FOUND for an unknown /api route', async () => {
    expectError(await request(testApp()).get('/api/does-not-exist'), 'NOT_FOUND')
  })

  it('returns 500 INTERNAL_ERROR without the stack or the original message', async () => {
    const response = await request(testApp()).get('/api/test/throw')
    expectError(response, 'INTERNAL_ERROR')
    expect(response.text).not.toContain('connection refused')
    expect(response.text).not.toContain('/srv/internal')
    expect(response.text).not.toMatch(/\bat\s.+:\d+:\d+/)
  })

  it('logs one error line with the request ID, name and stack frames, but not the message', async () => {
    const response = await request(testApp()).get('/api/test/throw')
    const errorLines = lines.map((line) => JSON.parse(line)).filter((entry) => entry.event === 'error')
    expect(errorLines).toHaveLength(1)
    expect(errorLines[0]).toMatchObject({ requestId: response.headers['x-request-id'], name: 'Error' })
    expect(errorLines[0].stack.length).toBeGreaterThan(0)
    expect(errorLines[0].stack.every((frame: string) => frame.startsWith('at '))).toBe(true)
    expect(lines.join('\n')).not.toContain('connection refused')
    expect(consoleError).not.toHaveBeenCalled()
  })
})

describe('request IDs', () => {
  it('sends a server-generated X-Request-Id on success', async () => {
    const response = await request(testApp()).get('/api/health')
    expect(response.headers['x-request-id']).toMatch(UUID)
  })

  it('matches the header and the error body', async () => {
    const response = await request(testApp()).get('/api/nope')
    expect(response.headers['x-request-id']).toBe(response.body.error.requestId)
  })

  it('ignores an X-Request-Id sent by the client', async () => {
    const response = await request(testApp()).get('/api/health').set('X-Request-Id', 'my-id')
    expect(response.headers['x-request-id']).not.toBe('my-id')
    expect(response.headers['x-request-id']).toMatch(UUID)
  })

  it('gives each request its own ID', async () => {
    const app = testApp()
    const [first, second] = await Promise.all([request(app).get('/api/health'), request(app).get('/api/health')])
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id'])
  })
})

describe('JSON request bodies', () => {
  it('accepts a JSON body', async () => {
    const response = await request(testApp()).post('/api/test/echo').send({ destination: 'Lisbon' })
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { destination: 'Lisbon' } })
  })

  it('returns 415 for another content type', async () => {
    const response = await request(testApp())
      .post('/api/test/echo')
      .set('Content-Type', 'text/plain')
      .send('destination=Lisbon')
    expectError(response, 'UNSUPPORTED_MEDIA_TYPE')
  })

  it('returns 400 INVALID_JSON for malformed JSON', async () => {
    const response = await request(testApp())
      .post('/api/test/echo')
      .set('Content-Type', 'application/json')
      .send('{"destination":')
    expectError(response, 'INVALID_JSON')
  })

  it('returns 413 for a 50 KB body', async () => {
    const response = await request(testApp())
      .post('/api/test/echo')
      .send({ note: 'x'.repeat(50 * 1024) })
    expectError(response, 'PAYLOAD_TOO_LARGE')
  })
})

describe('CORS', () => {
  it('allows the configured origin, POST and Content-Type in a preflight', async () => {
    const response = await request(testApp())
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(response.headers['access-control-allow-methods']).toContain('POST')
    expect(response.headers['access-control-allow-headers']).toContain('Content-Type')
  })

  it('sends no allow header to another origin', async () => {
    const response = await request(testApp()).get('/api/health').set('Origin', 'https://evil.example')
    expect(response.status).toBe(200)
    expect(response.headers).not.toHaveProperty('access-control-allow-origin')
  })

  it('sends no allow header in a preflight from another origin', async () => {
    const response = await request(testApp())
      .options('/api/health')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST')
    expect(response.headers).not.toHaveProperty('access-control-allow-origin')
  })
})

describe('request logging', () => {
  it('logs method, path, status, duration and request ID, but not the body', async () => {
    const response = await request(testApp())
      .post('/api/test/echo?token=query-secret')
      .send({ note: 'secret-note' })
    expect(lines).toHaveLength(1)
    const entry = JSON.parse(lines[0])
    expect(entry).toMatchObject({
      method: 'POST',
      path: '/api/test/echo',
      status: 200,
      requestId: response.headers['x-request-id'],
    })
    expect(entry.ms).toBeTypeOf('number')
    expect(entry.time).toBeTypeOf('string')
    expect(entry).not.toHaveProperty('code')
    expect(lines.join('\n')).not.toContain('secret-note')
    expect(lines.join('\n')).not.toContain('query-secret')
  })

  it('adds the error code to the log line of an error response', async () => {
    await request(testApp()).get('/api/does-not-exist')
    expect(JSON.parse(lines[0])).toMatchObject({ path: '/api/does-not-exist', status: 404, code: 'NOT_FOUND' })
  })

  it('logs one aborted line, without a status, when the client goes away first', async () => {
    const server: Server = testApp().listen(0)
    try {
      const { port } = server.address() as AddressInfo
      const client = get(`http://127.0.0.1:${port}/api/test/hang`)
      client.on('error', () => {})
      setTimeout(() => client.destroy(), 50)
      await vi.waitFor(() => expect(lines).toHaveLength(1), { timeout: 2000 })
      const entry = JSON.parse(lines[0])
      expect(entry).toMatchObject({ method: 'GET', path: '/api/test/hang', aborted: true })
      expect(entry).not.toHaveProperty('status')
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(lines).toHaveLength(1)
    } finally {
      server.closeAllConnections()
      server.close()
    }
  })
})
