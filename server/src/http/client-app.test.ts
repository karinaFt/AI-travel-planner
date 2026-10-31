import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { apiErrorBodySchema } from '@travel-planner/shared'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.ts'
import { loadConfig } from '../config.ts'
import { createLogger } from './logger.ts'

const INDEX_HTML = '<!doctype html><title>AI Travel Planner</title><div id="root"></div>'
let clientDir: string

beforeAll(() => {
  clientDir = mkdtempSync(path.join(tmpdir(), 'client-app-'))
  writeFileSync(path.join(clientDir, 'index.html'), INDEX_HTML)
  writeFileSync(path.join(clientDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
  mkdirSync(path.join(clientDir, 'assets'))
  writeFileSync(path.join(clientDir, 'assets', 'app-abc123.js'), 'console.log(1)')
})

afterAll(() => {
  rmSync(clientDir, { recursive: true, force: true })
})

const app = (env: Record<string, string> = { CLIENT_DIR: clientDir }) =>
  createApp({ config: loadConfig(env), log: createLogger(() => {}) })

describe('serving the client', () => {
  it.each(['/', '/plan', '/trips/abc'])('answers %s with index.html, never cached', async (route) => {
    const response = await request(app()).get(route)
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toMatch(/^text\/html/)
    expect(response.headers['cache-control']).toBe('no-cache')
    expect(response.text).toBe(INDEX_HTML)
  })

  it('caches hashed assets for a year and other files not at all', async () => {
    const asset = await request(app()).get('/assets/app-abc123.js')
    expect(asset.status).toBe(200)
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable')

    const favicon = await request(app()).get('/favicon.svg')
    expect(favicon.headers['cache-control']).toBe('no-cache')
  })

  it('keeps the JSON 404 for unknown API paths', async () => {
    const response = await request(app()).get('/api/unknown')
    expect(response.status).toBe(404)
    expect(apiErrorBodySchema.parse(response.body).error.code).toBe('NOT_FOUND')
  })

  it('still answers the API', async () => {
    const response = await request(app()).get('/api/health')
    expect(response.body).toEqual({ data: { status: 'ok' } })
  })

  it('does not answer other methods with index.html', async () => {
    const response = await request(app()).post('/plan')
    expect(response.status).toBe(404)
    expect(response.text).not.toBe(INDEX_HTML)
  })

  it('keeps the security headers on the page', async () => {
    const response = await request(app()).get('/')
    expect(response.headers['content-security-policy']).toContain("script-src 'self'")
    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })

  it('serves only the API when CLIENT_DIR is not set', async () => {
    const response = await request(app({})).get('/plan')
    expect(response.status).toBe(404)
    expect(response.text).not.toBe(INDEX_HTML)
  })
})
