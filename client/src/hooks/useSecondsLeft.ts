import { useEffect, useState } from 'react'

/** Whole seconds left until `until` (ms since the epoch), updated every second until it reaches 0. */
export function useSecondsLeft(until: number | undefined) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (until === undefined) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [until])

  return until === undefined ? 0 : Math.max(0, Math.ceil((until - now) / 1000))
}
