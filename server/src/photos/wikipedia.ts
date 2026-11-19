import { PHOTO_SOURCE_PREFIX, isPhotoUrl } from '@travel-planner/shared'

export type Photo = { url: string; sourceUrl: string }

/** Finds one photo for a place. Never throws: no photo, an error or a timeout all give `null`. */
export type FindPhoto = (place: string, destination: string, signal?: AbortSignal) => Promise<Photo | null>

export type PhotoFinderOptions = {
  /** Injected so tests never reach the network. */
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
  cacheSize?: number
}

const API_URL = 'https://en.wikipedia.org/w/api.php'
/** Wikimedia asks automated clients for a descriptive User-Agent. No personal contact details. */
const USER_AGENT = 'AI-Travel-Planner/1.0 (+https://ai-travel-planner-blsx.onrender.com)'
const THUMBNAIL_WIDTH = 800

type SearchResponse = {
  query?: { pages?: { index?: number; thumbnail?: { source?: unknown }; pageimage?: unknown }[] }
}

function toPhoto(body: SearchResponse): Photo | null {
  const pages = body.query?.pages ?? []
  const page = pages.toSorted((a, b) => (a.index ?? 0) - (b.index ?? 0))[0]
  const url = page?.thumbnail?.source
  const file = page?.pageimage
  if (typeof url !== 'string' || !isPhotoUrl(url) || typeof file !== 'string' || !file) return null
  return { url, sourceUrl: PHOTO_SOURCE_PREFIX + encodeURIComponent(file.replaceAll(' ', '_')) }
}

/**
 * Looks up a place's lead image with one MediaWiki search request (no key needed). Results, including
 * "no photo", are cached in memory per place and destination; the oldest entry goes first when full.
 */
export function createPhotoFinder({
  fetch = globalThis.fetch,
  timeoutMs = 3000,
  cacheSize = 500,
}: PhotoFinderOptions = {}): FindPhoto {
  const cache = new Map<string, Photo | null>()

  const remember = (key: string, photo: Photo | null) => {
    cache.set(key, photo)
    if (cache.size > cacheSize) cache.delete(cache.keys().next().value as string)
    return photo
  }

  return async (place, destination, signal) => {
    const key = `${place}|${destination}`.trim().toLowerCase()
    if (cache.has(key)) return cache.get(key) ?? null

    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      generator: 'search',
      gsrsearch: `${place} ${destination}`,
      gsrlimit: '1',
      prop: 'pageimages',
      piprop: 'thumbnail|name',
      pithumbsize: String(THUMBNAIL_WIDTH),
    })
    const timeout = AbortSignal.timeout(timeoutMs)
    try {
      const response = await fetch(`${API_URL}?${params}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      })
      if (!response.ok) return null
      return remember(key, toPhoto((await response.json()) as SearchResponse))
    } catch {
      // Network errors and timeouts aren't cached: the next brief may have better luck.
      return null
    }
  }
}
