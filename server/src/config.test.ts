import { describe, expect, it } from 'vitest'
import {
  ConfigError,
  DEFAULT_ALLOWED_ORIGINS,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_PORT,
  loadConfig,
  startupSummary,
} from './config.ts'

/** The error `loadConfig` throws for this env, or undefined if it accepts it. */
function configError(env: Record<string, string>) {
  try {
    loadConfig(env)
    return undefined
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError)
    return error as ConfigError
  }
}

describe('loadConfig', () => {
  it('applies the defaults when nothing is set', () => {
    expect(loadConfig({})).toEqual({
      port: 3001,
      allowedOrigins: ['http://localhost:5173'],
      gemini: { apiKey: undefined, model: 'gemini-3.5-flash-lite' },
    })
    expect(DEFAULT_PORT).toBe(3001)
    expect(DEFAULT_ALLOWED_ORIGINS).toEqual(['http://localhost:5173'])
  })

  it('treats blank variables as unset', () => {
    expect(loadConfig({ PORT: '', ALLOWED_ORIGINS: '  ', GEMINI_API_KEY: ' ', GEMINI_MODEL: '' })).toEqual(
      loadConfig({}),
    )
  })

  it('reads a valid port', () => {
    expect(loadConfig({ PORT: '8080' }).port).toBe(8080)
    expect(loadConfig({ PORT: ' 1 ' }).port).toBe(1)
    expect(loadConfig({ PORT: '65535' }).port).toBe(65535)
  })

  it.each(['abc', '0', '70000', '30.5', '-1', '3001abc'])('rejects PORT=%s without echoing it', (port) => {
    const error = configError({ PORT: port })
    expect(error?.message).toMatch(/^PORT must be/)
    expect(error?.message).not.toContain(port)
  })

  it('trims the origin list and drops empty items', () => {
    expect(
      loadConfig({ ALLOWED_ORIGINS: ' http://localhost:5173 , https://planner.example,, ' }).allowedOrigins,
    ).toEqual(['http://localhost:5173', 'https://planner.example'])
  })

  it.each([
    'not a url',
    'http://localhost:5173/',
    'https://planner.example/app',
    'ftp://files.example',
    'planner.example:8080',
    'https://ok.example,garbage-origin',
    ',,',
  ])('rejects ALLOWED_ORIGINS=%s without echoing it', (origins) => {
    const error = configError({ ALLOWED_ORIGINS: origins })
    expect(error?.message).toMatch(/^ALLOWED_ORIGINS must be/)
    for (const item of origins.split(',').filter((part) => part.trim() !== '')) {
      expect(error?.message).not.toContain(item)
    }
  })

  it('names every invalid variable, one per line', () => {
    const lines = configError({ PORT: 'abc', ALLOWED_ORIGINS: 'nope' })?.message.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines?.[0]).toMatch(/^PORT /)
    expect(lines?.[1]).toMatch(/^ALLOWED_ORIGINS /)
  })

  it('reads the Gemini key and model', () => {
    expect(loadConfig({ GEMINI_API_KEY: ' test-key-123 ', GEMINI_MODEL: 'gemini-3.8-flash' }).gemini).toEqual({
      apiKey: 'test-key-123',
      model: 'gemini-3.8-flash',
    })
    expect(loadConfig({ GEMINI_MODEL: 'models/gemini-3.8-flash' }).gemini.model).toBe('models/gemini-3.8-flash')
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3.5-flash-lite')
  })

  it.each(['my model', '-leading-dash', 'gemini?flash', 'x'.repeat(101)])(
    'rejects GEMINI_MODEL=%s without echoing it',
    (model) => {
      const error = configError({ GEMINI_MODEL: model })
      expect(error?.message).toMatch(/^GEMINI_MODEL must be/)
      expect(error?.message).not.toContain(model)
    },
  )
})

describe('startupSummary', () => {
  it('reports the model and whether generation is enabled, never the key', () => {
    const withKey = startupSummary(loadConfig({ GEMINI_API_KEY: 'secret-key-value' }))
    expect(withKey).toEqual({ url: 'http://localhost:3001', model: 'gemini-3.5-flash-lite', generation: 'enabled' })
    expect(JSON.stringify(withKey)).not.toContain('secret-key-value')
    expect(startupSummary(loadConfig({})).generation).toBe('disabled')
  })
})
