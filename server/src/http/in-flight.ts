export type InFlightGuard = {
  /** Takes the slot for `key`: returns its `release`, or undefined while another holder has it. */
  tryAcquire(key: string): (() => void) | undefined
}

/** One running generation per client key, kept in this process's memory. */
export function createInFlightGuard(): InFlightGuard {
  const busy = new Set<string>()
  return {
    tryAcquire(key) {
      if (busy.has(key)) return undefined
      busy.add(key)
      let released = false
      // Safe to call more than once: only the first call frees the slot.
      return () => {
        if (released) return
        released = true
        busy.delete(key)
      }
    },
  }
}
