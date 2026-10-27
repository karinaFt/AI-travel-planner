import { z } from 'zod'

export const DEFAULT_PORT = 3001
export const DEFAULT_ALLOWED_ORIGINS: readonly string[] = ['http://localhost:5173']

export type Config = {
  port: number
  allowedOrigins: readonly string[]
}

/** One line per invalid variable. Messages never include the rejected value. */
const MESSAGES = {
  PORT: 'PORT must be a whole number from 1 to 65535',
  ALLOWED_ORIGINS:
    'ALLOWED_ORIGINS must be a comma-separated list of http(s) origins without a path, such as http://localhost:5173',
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
})

/** Reads and validates the server configuration from an environment object. Throws `ConfigError`. */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    const invalid = new Set(result.error.issues.map((issue) => issue.path[0] as Variable))
    throw new ConfigError([...invalid].map((name) => MESSAGES[name]).join('\n'))
  }
  return {
    port: result.data.PORT ?? DEFAULT_PORT,
    allowedOrigins: result.data.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS,
  }
}
