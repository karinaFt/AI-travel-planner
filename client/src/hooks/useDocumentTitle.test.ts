import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDocumentTitle } from './useDocumentTitle.ts'

describe('useDocumentTitle', () => {
  it('uses the app name alone when no page name is given', () => {
    renderHook(() => useDocumentTitle())

    expect(document.title).toBe('AI Travel Planner')
  })

  it('prefixes the page name', () => {
    renderHook(() => useDocumentTitle('Plan a trip'))

    expect(document.title).toBe('Plan a trip · AI Travel Planner')
  })

  it('updates when the page name changes', () => {
    const { rerender } = renderHook(({ name }) => useDocumentTitle(name), {
      initialProps: { name: 'Plan a trip' },
    })

    rerender({ name: 'Page not found' })

    expect(document.title).toBe('Page not found · AI Travel Planner')
  })
})
