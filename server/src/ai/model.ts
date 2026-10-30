/** What the server asks the AI for: fixed rules, the trip data, and the JSON shape to return. */
export type GenerateRequest = {
  systemInstruction: string
  contents: string
  responseJsonSchema: object
}

/**
 * The AI behind itinerary generation. Resolves with the raw JSON text; rejects only with an `AppError`
 * carrying an `AI_*` code, so provider details never leave the adapter.
 */
export type ItineraryModel = {
  generate(request: GenerateRequest, signal?: AbortSignal): Promise<string>
}
