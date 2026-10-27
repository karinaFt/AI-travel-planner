import { describe, expect, it } from 'vitest'
import { ConfigError, DEFAULT_ALLOWED_ORIGINS, DEFAULT_PORT, loadConfig } from './config.ts'

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
    expect(loadConfig({})).toEqual({ port: 3001, allowedOrigins: ['http://localhost:5173'] })
    expect(DEFAULT_PORT).toBe(3001)
    expect(DEFAULT_ALLOWED_ORIGINS).toEqual(['http://localhost:5173'])
  })

  it('treats blank variables as unset', () => {
    expect(loadConfig({ PORT: '', ALLOWED_ORIGINS: '  ' })).toEqual(loadConfig({}))
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
})
