import { ApiError, type GenerateContentParameters, type GenerateContentResponse } from '@google/genai'
import { describe, expect, it, vi } from 'vitest'
import { AppError } from '../http/errors.ts'
import { createGeminiModel, type GeminiClient } from './gemini.ts'
import { responseJsonSchema } from './response-schema.ts'

const request = {
  systemInstruction: 'You are a travel planner.',
  contents: 'Plan this 3-day trip.',
  responseJsonSchema: responseJsonSchema(3),
}

/** A fake SDK client resolving with `text` and a finish reason, or rejecting with `error`. */
function fakeClient(result: { text?: string; finishReason?: string } | { error: unknown }) {
  const generateContent = vi.fn(async (_params: GenerateContentParameters) => {
    if ('error' in result) throw result.error
    return {
      text: result.text,
      candidates: [{ finishReason: result.finishReason ?? 'STOP' }],
    } as unknown as GenerateContentResponse
  })
  return { client: { models: { generateContent } } satisfies GeminiClient, generateContent }
}

function model(client: GeminiClient) {
  return createGeminiModel({ apiKey: 'test-key', model: 'gemini-3.8-flash', client })
}

/** The rejection of `promise`, checked to be an `AppError`. */
async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(AppError)
  return error as AppError
}

describe('createGeminiModel', () => {
  it('asks for JSON with the schema, system instruction, model and a low thinking level', async () => {
    const { client, generateContent } = fakeClient({ text: '{"days":[]}' })
    const signal = new AbortController().signal
    await expect(model(client).generate(request, signal)).resolves.toBe('{"days":[]}')

    expect(generateContent).toHaveBeenCalledOnce()
    const params = generateContent.mock.calls[0][0]
    expect(params.model).toBe('gemini-3.8-flash')
    expect(params.contents).toBe(request.contents)
    expect(params.config).toMatchObject({
      systemInstruction: request.systemInstruction,
      responseMimeType: 'application/json',
      responseJsonSchema: request.responseJsonSchema,
      thinkingConfig: { thinkingLevel: 'LOW' },
      abortSignal: signal,
    })
    expect(params.config?.responseJsonSchema).toMatchObject({ properties: { days: { minItems: 3, maxItems: 3 } } })
  })

  it.each([429, 503])('maps provider status %i to AI_UNAVAILABLE', async (status) => {
    const { client } = fakeClient({ error: new ApiError({ message: 'Resource exhausted: quota', status }) })
    expect((await rejection(model(client).generate(request))).code).toBe('AI_UNAVAILABLE')
  })

  it.each([
    ['a provider 500', new ApiError({ message: 'internal model failure', status: 500 })],
    ['a provider 400', new ApiError({ message: 'internal model failure: bad schema', status: 400 })],
    ['a network error', new TypeError('fetch failed: internal model failure')],
  ])('maps %s to AI_PROVIDER_ERROR without the provider text', async (_, error) => {
    const { client } = fakeClient({ error })
    const appError = await rejection(model(client).generate(request))
    expect(appError.code).toBe('AI_PROVIDER_ERROR')
    expect(appError.message).not.toContain('internal model failure')
    expect(appError.cause).toBeUndefined()
  })

  it.each([
    ['output cut off at the token limit', { text: '{"days":[', finishReason: 'MAX_TOKENS' }],
    ['blocked output', { text: undefined, finishReason: 'SAFETY' }],
    ['empty text', { text: '  ' }],
  ])('maps %s to AI_INVALID_RESPONSE', async (_, result) => {
    const { client } = fakeClient(result)
    expect((await rejection(model(client).generate(request))).code).toBe('AI_INVALID_RESPONSE')
  })
})
