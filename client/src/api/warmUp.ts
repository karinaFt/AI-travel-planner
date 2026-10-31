/**
 * Pings the API once so a free-tier server that went to sleep starts waking up while the user fills in the
 * form. Fire and forget: the result is ignored and failures are swallowed.
 */
export function warmUp() {
  fetch('/api/health', { cache: 'no-store' }).catch(() => {})
}
