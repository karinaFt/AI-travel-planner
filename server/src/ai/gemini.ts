import {
  ApiError,
  FinishReason,
  GoogleGenAI,
  ThinkingLevel,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai'
import { AppError } from '../http/errors.ts'
import type { ItineraryModel } from './model.ts'

/** The part of the SDK client the adapter uses; tests pass a fake. */
export type GeminiClient = {
  models: { generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse> }
}

export type GeminiOptions = {
  apiKey: string
  model: string
  client?: GeminiClient
}

/** Rate limiting, exhausted (free-tier) quota and overload: worth trying again later. */
const UNAVAILABLE_STATUSES = new Set([429, 503])

/** The only place that talks to the Gemini SDK. Errors leave as `AppError`s without provider text. */
export function createGeminiModel({
  apiKey,
  model,
  client = new GoogleGenAI({ apiKey }),
}: GeminiOptions): ItineraryModel {
  return {
    async generate({ systemInstruction, contents, responseJsonSchema }, signal) {
      let response: GenerateContentResponse
      try {
        response = await client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseJsonSchema,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: signal,
          },
        })
      } catch (error) {
        const unavailable = error instanceof ApiError && UNAVAILABLE_STATUSES.has(error.status)
        throw new AppError(unavailable ? 'AI_UNAVAILABLE' : 'AI_PROVIDER_ERROR')
      }

      // Cut off (MAX_TOKENS), blocked (SAFETY) or empty output can't be a complete itinerary.
      const text = response.text
      if (response.candidates?.[0]?.finishReason !== FinishReason.STOP || !text?.trim()) {
        throw new AppError('AI_INVALID_RESPONSE')
      }
      return text
    },
  }
}
