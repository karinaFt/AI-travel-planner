import path from 'node:path'
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
      trustProxy: 0,
      gemini: { apiKey: undefined, model: 'gemini-3.5-flash-lite' },
      clientDir: undefined,
      exposeClientIp: false,
    })
    expect(DEFAULT_PORT).toBe(3001)
    expect(DEFAULT_ALLOWED_ORIGINS).toEqual(['http://localhost:5173'])
  })

  it('treats blank variables as unset', () => {
    expect(loadConfig({ PORT: '', ALLOWED_ORIGINS: '  ', GEMINI_API_KEY: ' ', GEMINI_MODEL: '', TRUST_PROXY: '', CLIENT_DIR: ' ', EXPOSE_CLIENT_IP: '' })).toEqual(
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

describe('TRUST_PROXY', () => {
  it('reads a proxy count from 0 to 10', () => {
    expect(loadConfig({ TRUST_PROXY: '0' }).trustProxy).toBe(0)
    expect(loadConfig({ TRUST_PROXY: ' 1 ' }).trustProxy).toBe(1)
    expect(loadConfig({ TRUST_PROXY: '10' }).trustProxy).toBe(10)
  })

  it.each(['yes', 'true', '-1', '11', '1.5'])('rejects TRUST_PROXY=%s without echoing it', (value) => {
    const error = configError({ TRUST_PROXY: value })
    expect(error?.message).toMatch(/^TRUST_PROXY must be/)
    expect(error?.message).not.toContain(value)
  })
})

describe('startupSummary', () => {
  it('reports the model and whether generation is enabled, never the key', () => {
    const withKey = startupSummary(loadConfig({ GEMINI_API_KEY: 'secret-key-value' }))
    expect(withKey).toEqual({
      url: 'http://localhost:3001',
      model: 'gemini-3.5-flash-lite',
      generation: 'enabled',
      servesClient: false,
      exposesClientIp: false,
    })
    expect(JSON.stringify(withKey)).not.toContain('secret-key-value')
    expect(startupSummary(loadConfig({})).generation).toBe('disabled')
  })
})

describe('CLIENT_DIR', () => {
  const root = path.resolve('/srv/app/server')
  const builtClient = path.resolve('/srv/app/client/dist')
  const fileExists = (file: string) => file === path.join(builtClient, 'index.html')

  it('resolves a relative directory against the working directory', () => {
    expect(loadConfig({ CLIENT_DIR: '../client/dist' }, { cwd: root, fileExists }).clientDir).toBe(builtClient)
    expect(loadConfig({ CLIENT_DIR: builtClient }, { cwd: root, fileExists }).clientDir).toBe(builtClient)
  })

  it('stops when the directory has no index.html, without echoing the path', () => {
    let error: unknown
    try {
      loadConfig({ CLIENT_DIR: '../missing-build' }, { cwd: root, fileExists })
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(ConfigError)
    expect((error as ConfigError).message).toMatch(/^CLIENT_DIR must be a directory that contains index.html/)
    expect((error as ConfigError).message).not.toContain('missing-build')
  })

  it('reports whether the client is served, never the path', () => {
    const summary = startupSummary(loadConfig({ CLIENT_DIR: '../client/dist' }, { cwd: root, fileExists }))
    expect(summary.servesClient).toBe(true)
    expect(JSON.stringify(summary)).not.toContain('dist')
  })
})

describe('EXPOSE_CLIENT_IP', () => {
  it('is off unless set to true', () => {
    expect(loadConfig({}).exposeClientIp).toBe(false)
    expect(loadConfig({ EXPOSE_CLIENT_IP: 'false' }).exposeClientIp).toBe(false)
    expect(loadConfig({ EXPOSE_CLIENT_IP: ' true ' }).exposeClientIp).toBe(true)
  })

  it.each(['yes', '1', 'TRUE'])('rejects EXPOSE_CLIENT_IP=%s', (value) => {
    expect(configError({ EXPOSE_CLIENT_IP: value })?.message).toBe('EXPOSE_CLIENT_IP must be true or false')
  })
})
