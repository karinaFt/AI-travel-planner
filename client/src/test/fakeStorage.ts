/** A `Map`-backed stand-in for `localStorage`. Set `failWrites` to make `setItem` throw like a full storage. */
export class FakeStorage {
  readonly items = new Map<string, string>()
  failWrites: ((key: string) => boolean) | false = false

  getItem(key: string) {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string) {
    if (this.failWrites && this.failWrites(key)) {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    }
    this.items.set(key, value)
  }

  /** Keys that start with `prefix`. */
  keys(prefix = '') {
    return [...this.items.keys()].filter((key) => key.startsWith(prefix))
  }
}
