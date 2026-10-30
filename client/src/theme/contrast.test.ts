/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast.ts'

// Read the file from disk: Vitest does not process CSS, so `?raw` CSS imports are empty in tests.
const here = dirname(fileURLToPath(import.meta.url))
const indexCss = readFileSync(resolve(here, '../index.css'), 'utf8')

const TEXT = 4.5
const NON_TEXT = 3

function readColorTokens(css: string) {
  const theme = /@theme\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
  const tokens = new Map<string, string>()
  for (const [, name, value] of theme.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    tokens.set(name, value)
  }
  return tokens
}

const tokens = readColorTokens(indexCss)

// [foreground, background, minimum ratio]
const pairs: Array<[string, string, number]> = [
  ...['canvas', 'surface', 'mint', 'sky', 'coral-soft'].map(
    (bg): [string, string, number] => ['ink', bg, TEXT],
  ),
  ...['canvas', 'surface', 'mint', 'sky'].map(
    (bg): [string, string, number] => ['muted', bg, TEXT],
  ),
  ...['canvas', 'surface', 'mint'].map(
    (bg): [string, string, number] => ['primary', bg, TEXT],
  ),
  ['surface', 'primary', TEXT],
  ['surface', 'primary-hover', TEXT],
  ['coral-text', 'canvas', TEXT],
  ['coral-text', 'surface', TEXT],
  ['coral-text', 'coral-soft', TEXT],
  ['coral', 'canvas', NON_TEXT],
  ['line-strong', 'surface', NON_TEXT],
  ['line-strong', 'canvas', NON_TEXT],
  // The budget bar: its fill against the track, and the over-budget fill and border on the card.
  ['primary', 'line', NON_TEXT],
  ['coral-text', 'line', NON_TEXT],
  ['coral', 'surface', NON_TEXT],
]

describe('contrastRatio', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
  })
})

describe('theme tokens', () => {
  it('are read from index.css', () => {
    expect(tokens.size).toBeGreaterThanOrEqual(13)
  })

  it.each(pairs)('%s on %s meets %s:1', (fg, bg, minimum) => {
    const foreground = tokens.get(fg)
    const background = tokens.get(bg)
    expect(foreground, `missing --color-${fg}`).toBeDefined()
    expect(background, `missing --color-${bg}`).toBeDefined()

    expect(contrastRatio(foreground!, background!)).toBeGreaterThanOrEqual(minimum)
  })
})
