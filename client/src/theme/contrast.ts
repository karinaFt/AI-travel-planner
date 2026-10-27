// WCAG 2.1 relative luminance and contrast ratio for #rrggbb colors.

function channel(value: number) {
  const srgb = value / 255
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) {
    throw new Error(`Expected a #rrggbb color, got "${hex}"`)
  }
  const [r, g, b] = match.slice(1).map((part) => channel(parseInt(part, 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(foreground: string, background: string) {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
