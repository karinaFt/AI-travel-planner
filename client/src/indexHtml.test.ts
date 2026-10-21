import { describe, expect, it } from 'vitest'
import indexHtml from '../index.html?raw'

describe('index.html', () => {
  const doc = new DOMParser().parseFromString(indexHtml, 'text/html')

  it('uses the app name as the initial document title', () => {
    expect(doc.title).toBe('AI Travel Planner')
  })

  it('names the app in the no-JavaScript notice', () => {
    expect(doc.querySelector('noscript')?.textContent).toMatch(
      /JavaScript is required to use AI Travel Planner/,
    )
  })

  it('no longer mentions the old name', () => {
    expect(indexHtml).not.toContain('Smart Doc Assistant')
  })
})
