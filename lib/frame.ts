import type { Format } from './format.ts'
import type { Rect } from './geometry.ts'
import type { Chart } from './spec.ts'
import { text, wrap } from './svg.ts'
import type { Theme } from './themes.ts'

export const W = 1080
export const H = 1350
export const M = 72
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"

// Everything a chart body draws with: the spec, the theme, its box and the number format.
export interface Draw {
  out: string[]
  spec: Chart
  t: Theme
  b: Rect
  fmt: Format
}

export interface Frame {
  out: string[]
  box: Rect
}

// The title block on top and the source at the foot; the body gets the box between them.
export function frame(spec: Chart, t: Theme): Frame {
  const out: string[] = []
  const y = header(out, { spec, t })
  const box = { x: M, y: y + 24, w: W - 2 * M, h: H - 150 - (y + 24) }

  footer(out, { spec, t })

  return { out, box }
}

export function svg(t: Theme, parts: ReadonlyArray<string>): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">` +
    `<rect width="${W}" height="${H}" fill="${t.bg}"/>` +
    parts.join('') +
    '</svg>'
  )
}

interface Styled {
  spec: Chart
  t: Theme
}

function header(out: string[], { spec, t }: Styled): number {
  let y = M + 56

  for (const line of wrap(spec.title, { width: W - 2 * M, size: 66 })) {
    out.push(text(line, { x: M, y, size: 66, weight: 800, fill: t.text, spacing: -1 }))
    y += 72
  }

  y += 4
  for (const line of wrap(spec.subtitle, { width: W - 2 * M, size: 30 })) {
    out.push(text(line, { x: M, y, size: 30, fill: t.muted }))
    y += 40
  }

  return y
}

function footer(out: string[], { spec, t }: Styled): void {
  const y = H - 112
  const lines = wrap('Source: ' + spec.source, { width: W - 2 * M, size: 20 }).slice(0, 2)

  out.push(`<rect x="${M}" y="${y}" width="${W - 2 * M}" height="2" fill="${t.faint}"/>`)
  lines.forEach((line, i) =>
    out.push(text(line, { x: M, y: y + 44 + i * 28, size: 20, fill: t.muted }))
  )
}

export interface Place {
  x: number
  y: number
  w: number
}

// The derived number, large and right-aligned, with its one-line explanation under it.
export function callout({ out, spec, t }: Draw, { x, y, w }: Place): void {
  if (!spec.callout) return

  out.push(
    text(spec.callout.value, {
      x: x + w,
      y,
      size: 120,
      weight: 800,
      fill: t.accent,
      anchor: 'end',
      spacing: -3
    })
  )
  wrap(spec.callout.text, { width: w, size: 26 }).forEach((line, i) =>
    out.push(text(line, { x: x + w, y: y + 46 + i * 34, size: 26, fill: t.text, anchor: 'end' }))
  )
}
