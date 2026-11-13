import { callout, type Draw } from '../frame.ts'
import { ceiling, dodge, ticks } from '../geometry.ts'
import type { Row } from '../spec.ts'
import { text, wrap } from '../svg.ts'

interface Axes {
  px: (i: number) => number
  py: (v: number) => number
  left: number
  width: number
}

// Horizontal gridlines with their values, one per tick of the scale.
interface Grid extends Axes {
  max: number
}

function grid({ out, t, fmt }: Draw, { py, left, width, max }: Grid): void {
  const tk = ticks(max)
  const td = tk.some((v) => !Number.isInteger(v)) ? 1 : 0

  for (const v of tk) {
    out.push(`<rect x="${left}" y="${py(v)}" width="${width}" height="1.5" fill="${t.faint}"/>`)
    out.push(
      text(fmt(v, td), { x: left - 14, y: py(v) + 8, size: 22, fill: t.muted, anchor: 'end' })
    )
  }
}

export function line(d: Draw): void {
  const { out, spec, t, b } = d
  const pts = spec.data
  const max = ceiling(pts.map((p) => p.value)) * 1.12
  const pad = { l: 90, r: 40, t: 160, b: 60 }
  const px = (i: number): number => b.x + pad.l + (i * (b.w - pad.l - pad.r)) / (pts.length - 1)
  const py = (v: number): number => b.y + b.h - pad.b - (v / max) * (b.h - pad.t - pad.b)
  const axes = { px, py, left: b.x + pad.l, width: b.w - pad.l - pad.r }

  grid(d, { ...axes, max })
  pts.forEach((p, i) =>
    out.push(
      text(p.label, {
        x: px(i),
        y: b.y + b.h - pad.b + 40,
        size: 24,
        fill: t.muted,
        anchor: 'middle'
      })
    )
  )

  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${px(i)},${py(p.value)}`).join('')

  out.push(
    `<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity="0.45"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient></defs>`
  )
  out.push(
    `<path d="${path}L${px(pts.length - 1)},${py(0)}L${px(0)},${py(0)}Z" fill="url(#area)"/>`
  )
  out.push(
    `<path d="${path}" fill="none" stroke="${t.accent}" stroke-width="6" stroke-linejoin="round"/>`
  )

  pts.forEach((p, i) => {
    out.push(
      `<circle cx="${px(i)}" cy="${py(p.value)}" r="8" fill="${t.bg}" stroke="${t.accent}" stroke-width="5"/>`
    )
    if (p.note) {
      out.push(...note(d, { p, i, axes }))
    }
  })
  callout(d, { x: b.x + pad.l, y: b.y + 100, w: 380 })
}

interface Annotated {
  p: Row
  i: number
  axes: Axes
}

// An annotation above its point, raised to clear the line under the whole text block.
function note({ spec, t, b, fmt }: Draw, { p, i, axes: { px, py } }: Annotated): string[] {
  const pts = spec.data
  const x = px(i)
  const anchor = i > pts.length * 0.6 ? 'end' : 'start'
  const lines = wrap(p.note ?? '', { width: 300, size: 22 })
  const tx = anchor === 'end' ? x - 12 : x + 12
  const x1 = anchor === 'end' ? tx - 300 : tx + 300
  const under = pts.filter(
    (_, j) => (px(j) - tx) * (px(j) - x1) <= 0 || j === i + (anchor === 'end' ? -1 : 1)
  )
  const peak = Math.min(...under.map((q) => py(q.value)), py(p.value))
  const top = Math.max(b.y, peak - 50 - lines.length * 28 - 34)

  return [
    `<rect x="${x - 1}" y="${top + 12}" width="2" height="${py(p.value) - top - 22}" fill="${t.muted}"/>`,
    text(fmt(p.value), { x: tx, y: top + 30, size: 30, weight: 800, fill: t.text, anchor }),
    ...lines.map((l, j) =>
      text(l, { x: tx, y: top + 62 + j * 28, size: 22, fill: t.muted, anchor })
    )
  ]
}

export function column(d: Draw): void {
  const { out, spec, t, b, fmt } = d
  const pts = spec.data
  const hl = spec.highlight ?? pts[pts.length - 1].label
  const max = ceiling(pts.map((p) => p.value)) * 1.12
  const top = b.y + (spec.callout ? 190 : 20)
  const base = b.y + b.h - 60
  const slot = b.w / pts.length
  const bw = Math.min(140, slot * 0.64)

  pts.forEach((p, i) => {
    const on = p.label === hl
    const h = (Math.max(0, p.value) / max) * (base - top)
    const x = b.x + i * slot + (slot - bw) / 2

    out.push(
      `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="6" fill="${on ? t.accent : t.base}"/>`
    )
    out.push(
      text(fmt(p.value), {
        x: x + bw / 2,
        y: base - h - 16,
        size: 28,
        weight: 800,
        fill: on ? t.accent : t.text,
        anchor: 'middle'
      })
    )
    out.push(
      text(p.label, { x: x + bw / 2, y: base + 40, size: 24, fill: t.muted, anchor: 'middle' })
    )
  })
  out.push(`<rect x="${b.x}" y="${base}" width="${b.w}" height="2" fill="${t.faint}"/>`)
  callout(d, { x: b.x, y: b.y + 100, w: 420 })
}

interface End {
  x: number
  y: number
  g: string
  v: number
  c: string
}

export function multiLine(d: Draw): void {
  const { out, spec, t, b, fmt } = d
  const labels = [...new Set(spec.data.map((p) => p.label))]
  const groups = [...new Set(spec.data.map((p) => p.group ?? ''))]
  const max = ceiling(spec.data.map((p) => p.value)) * 1.12
  const pad = { l: 90, r: 230, t: 40, b: 60 }
  const px = (i: number): number =>
    b.x + pad.l + (i * (b.w - pad.l - pad.r)) / Math.max(1, labels.length - 1)
  const py = (v: number): number => b.y + b.h - pad.b - (v / max) * (b.h - pad.t - pad.b)
  const color = (g: string, i: number): string =>
    g === spec.highlight ? t.accent : t.palette[(i + 1) % t.palette.length]
  const ends: End[] = []

  grid(d, { px, py, left: b.x + pad.l, width: b.w - pad.l - pad.r, max })
  labels.forEach((l, i) =>
    out.push(
      text(l, { x: px(i), y: b.y + b.h - pad.b + 40, size: 24, fill: t.muted, anchor: 'middle' })
    )
  )

  groups.forEach((g, gi) => {
    const pts = labels.flatMap((l, i) => {
      const p = spec.data.find((q) => (q.group ?? '') === g && q.label === l)

      return p ? [{ i, p }] : []
    })
    const path = pts.map(({ i, p }, k) => `${k ? 'L' : 'M'}${px(i)},${py(p.value)}`).join('')
    const on = g === spec.highlight
    const last = pts[pts.length - 1]

    out.push(
      `<path d="${path}" fill="none" stroke="${color(g, gi)}" stroke-width="${on ? 8 : 5}" stroke-linejoin="round" stroke-linecap="round"/>`
    )
    out.push(`<circle cx="${px(last.i)}" cy="${py(last.p.value)}" r="8" fill="${color(g, gi)}"/>`)
    ends.push({ y: py(last.p.value), x: px(last.i), g, v: last.p.value, c: color(g, gi) })
  })

  dodge(ends, { gap: 56, lo: b.y, hi: b.y + b.h - pad.b })
  for (const e of ends) {
    out.push(text(e.g, { x: e.x + 20, y: e.y + 2, size: 24, weight: 800, fill: e.c }))
    out.push(text(fmt(e.v), { x: e.x + 20, y: e.y + 28, size: 22, fill: t.muted }))
  }
}
