import { activityAnchorId } from '../itinerary/dayIds.ts'

const FLASH_MS = 2000
const flashTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()

/** Scrolls an activity into view, focuses it and highlights it for about 2 seconds. */
export function jumpToActivity(activityId: string) {
  const element = document.getElementById(activityAnchorId(activityId))
  if (!element) return
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  element.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  element.focus({ preventScroll: true })

  clearTimeout(flashTimers.get(element))
  element.setAttribute('data-flash', '')
  flashTimers.set(
    element,
    setTimeout(() => element.removeAttribute('data-flash'), FLASH_MS),
  )
}
