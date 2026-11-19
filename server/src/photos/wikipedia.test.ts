import { describe, expect, it, vi } from 'vitest'
import { createPhotoFinder } from './wikipedia.ts'

const THUMB = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Belem_Tower.jpg/800px-Belem_Tower.jpg'

function fakeFetch(respond: (url: URL, init?: RequestInit) => Response | Promise<Response>) {
  return vi.fn<typeof fetch>(async (input, init) => respond(new URL(String(input)), init))
}

const found = (thumbnail = THUMB, pageimage = 'Belém Tower.jpg') =>
  Response.json({ query: { pages: [{ index: 1, thumbnail: { source: thumbnail }, pageimage }] } })

describe('createPhotoFinder', () => {
  it('finds a lead image with one search request and links its Commons file page', async () => {
    const fetch = fakeFetch(() => found())
    const photo = await createPhotoFinder({ fetch })('Belém Tower', 'Lisbon')

    expect(photo).toEqual({ url: THUMB, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bel%C3%A9m_Tower.jpg' })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [input, init] = fetch.mock.calls[0]
    const url = new URL(String(input))
    expect(url.origin + url.pathname).toBe('https://en.wikipedia.org/w/api.php')
    expect(url.searchParams.get('gsrsearch')).toBe('Belém Tower Lisbon')
    expect(url.searchParams.get('pithumbsize')).toBe('800')
    const headers = init?.headers as Record<string, string>
    expect(headers['User-Agent']).toMatch(/^AI-Travel-Planner\//)
    expect(headers['User-Agent']).not.toContain('@')
  })

  it('accepts thumbnails from thumb.wikimedia.org, as the API serves them now', async () => {
    const thumb =
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Kloster.jpg/960px-Kloster.jpg?utm_source=en.wikipedia.org'
    const photo = await createPhotoFinder({ fetch: fakeFetch(() => found(thumb, 'Kloster.jpg')) })('Jerónimos Monastery', 'Lisbon')
    expect(photo).toEqual({ url: thumb, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kloster.jpg' })
  })

  it('picks the best-ranked page', async () => {
    const other = 'https://upload.wikimedia.org/other.jpg'
    const fetch = fakeFetch(() =>
      Response.json({
        query: {
          pages: [
            { index: 2, thumbnail: { source: other }, pageimage: 'Other.jpg' },
            { index: 1, thumbnail: { source: THUMB }, pageimage: 'Best.jpg' },
          ],
        },
      }),
    )
    expect(await createPhotoFinder({ fetch })('Belém Tower', 'Lisbon')).toMatchObject({ url: THUMB })
  })

  it.each([
    ['no pages', () => Response.json({})],
    ['a page without an image', () => Response.json({ query: { pages: [{ index: 1 }] } })],
    ['a thumbnail on another host', () => found('https://example.com/a.jpg')],
    ['a non-200 answer', () => new Response('nope', { status: 500 })],
    ['a body that is not JSON', () => new Response('<html>')],
    ['a network error', () => Promise.reject(new TypeError('fetch failed'))],
  ])('gives null for %s', async (_label, respond) => {
    expect(await createPhotoFinder({ fetch: fakeFetch(respond) })('Belém Tower', 'Lisbon')).toBeNull()
  })

  it('gives null when the lookup takes longer than the timeout', async () => {
    const fetch = fakeFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
        }),
    )
    expect(await createPhotoFinder({ fetch, timeoutMs: 20 })('Belém Tower', 'Lisbon')).toBeNull()
  })

  it('caches results per place and destination, including no photo', async () => {
    const fetch = fakeFetch((url) => (url.searchParams.get('gsrsearch')?.startsWith('Nowhere') ? Response.json({}) : found()))
    const find = createPhotoFinder({ fetch })

    await find('Belém Tower', 'Lisbon')
    await find('belém tower', 'lisbon')
    await find('Nowhere', 'Lisbon')
    await find('Nowhere', 'Lisbon')
    expect(fetch).toHaveBeenCalledTimes(2)

    await find('Belém Tower', 'Porto')
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('does not cache failures', async () => {
    const fetch = fakeFetch(() => Promise.reject(new TypeError('fetch failed')))
    const find = createPhotoFinder({ fetch })
    await find('Belém Tower', 'Lisbon')
    await find('Belém Tower', 'Lisbon')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('drops the oldest entry when the cache is full', async () => {
    const fetch = fakeFetch(() => found())
    const find = createPhotoFinder({ fetch, cacheSize: 2 })
    await find('A', 'Lisbon')
    await find('B', 'Lisbon')
    await find('C', 'Lisbon')
    await find('A', 'Lisbon')
    expect(fetch).toHaveBeenCalledTimes(4)
  })
})
