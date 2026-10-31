import { existsSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'

export const DEFAULT_PORT = 3001
export const DEFAULT_ALLOWED_ORIGINS: readonly string[] = ['http://localhost:5173']
/** On the Gemini free tier: fast, with more free quota than the larger Flash models. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'
/** Reverse proxies in front of the API. 0 trusts no `X-Forwarded-For`, so clients can't spoof their IP. */
export const DEFAULT_TRUST_PROXY = 0
export const MAX_TRUST_PROXY = 10

export type Config = {
  port: number
  allowedOrigins: readonly string[]
  /** Hops of `X-Forwarded-For` to trust, for `app.set('trust proxy', …)`. */
  trustProxy: number
  gemini: {
    /** Secret: never log or echo it. Unset means generation is disabled. */
    apiKey?: string
    model: string
  }
  /** Absolute path of the built client to serve; unset serves only the API (local development). */
  clientDir?: string
  /** Mounts `GET /api/client-ip`, used once after deploying to check `TRUST_PROXY`. */
  exposeClientIp: boolean
}

/** One line per invalid variable. Messages never include the rejected value. */
const MESSAGES = {
  PORT: 'PORT must be a whole number from 1 to 65535',
  ALLOWED_ORIGINS:
    'ALLOWED_ORIGINS must be a comma-separated list of http(s) origins without a path, such as http://localhost:5173',
  GEMINI_MODEL: `GEMINI_MODEL must be a model name such as ${DEFAULT_GEMINI_MODEL}`,
  TRUST_PROXY: `TRUST_PROXY must be a whole number of proxies from 0 to ${MAX_TRUST_PROXY}`,
  CLIENT_DIR: 'CLIENT_DIR must be a directory that contains index.html (run npm run build first)',
  EXPOSE_CLIENT_IP: 'EXPOSE_CLIENT_IP must be true or false',
} as const

type Variable = keyof typeof MESSAGES

export class ConfigError extends Error {
  override name = 'ConfigError'
}

/** True for a bare `http(s)://host[:port]` origin: no path, query or trailing slash. */
function isHttpOrigin(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value
  } catch {
    return false
  }
}

/** An empty or whitespace-only variable counts as unset. */
const unsetIfBlank = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value)

const envSchema = z.object({
  PORT: z.preprocess(
    unsetIfBlank,
    z
      .string()
      .trim()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(65535))
      .optional(),
  ),
  ALLOWED_ORIGINS: z.preprocess(
    unsetIfBlank,
    z
      .string()
      .transform((list) =>
        list
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item !== ''),
      )
      .pipe(z.array(z.string().refine(isHttpOrigin)).min(1))
      .optional(),
  ),
  // No format check: key formats change. Blank counts as unset.
  GEMINI_API_KEY: z.preprocess(unsetIfBlank, z.string().trim().optional()),
  GEMINI_MODEL: z.preprocess(
    unsetIfBlank,
    z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/)
      .optional(),
  ),
  TRUST_PROXY: z.preprocess(
    unsetIfBlank,
    z
      .string()
      .trim()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().int().min(0).max(MAX_TRUST_PROXY))
      .optional(),
  ),
  CLIENT_DIR: z.preprocess(unsetIfBlank, z.string().trim().optional()),
  EXPOSE_CLIENT_IP: z.preprocess(unsetIfBlank, z.string().trim().pipe(z.enum(['true', 'false'])).optional()),
})

type FileSystem = {
  /** Where a relative `CLIENT_DIR` starts; npm runs the server from server/. */
  cwd?: string
  fileExists?: (file: string) => boolean
}

/** Reads and validates the server configuration from an environment object. Throws `ConfigError`. */
export function loadConfig(
  env: Record<string, string | undefined>,
  { cwd = process.cwd(), fileExists = existsSync }: FileSystem = {},
): Config {
  const result = envSchema.safeParse(env)
  const invalid = new Set(result.error?.issues.map((issue) => issue.path[0] as Variable))
  const clientDir = result.data?.CLIENT_DIR === undefined ? undefined : path.resolve(cwd, result.data.CLIENT_DIR)
  if (clientDir !== undefined && !fileExists(path.join(clientDir, 'index.html'))) invalid.add('CLIENT_DIR')
  if (!result.success || invalid.size > 0) {
    throw new ConfigError([...invalid].map((name) => MESSAGES[name]).join('\n'))
  }
  return {
    port: result.data.PORT ?? DEFAULT_PORT,
    allowedOrigins: result.data.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS,
    trustProxy: result.data.TRUST_PROXY ?? DEFAULT_TRUST_PROXY,
    gemini: {
      apiKey: result.data.GEMINI_API_KEY,
      model: result.data.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
    },
    clientDir,
    exposeClientIp: result.data.EXPOSE_CLIENT_IP === 'true',
  }
}

/** Fields for the startup log line. Never includes the API key or the client path. */
export function startupSummary(config: Config) {
  return {
    url: `http://localhost:${config.port}`,
    model: config.gemini.model,
    generation: config.gemini.apiKey ? 'enabled' : 'disabled',
    servesClient: config.clientDir !== undefined,
    exposesClientIp: config.exposeClientIp,
  } as const
}
