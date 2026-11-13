import type { Draw } from '../frame.ts'
import { dodge } from '../geometry.ts'
import type { Row } from '../spec.ts'
import { text } from '../svg.ts'

interface Paired extends Row {
  previous: number
}

interface Slot {
  d: Paired
  y: number
}

const paired = (d: Row): d is Paired => d.previous !== undefined

export function slope({ out, spec, t, b, fmt }: Draw): void {
  const items = spec.data.filter(paired)
  const all = items.flatMap((d) => [d.value, d.previous])
  const lo = Math.min(0, ...all)
  const hi = Math.max(...all) * 1.05
  const lx = b.x + 300
  const rx = b.x + b.w - 300
  const top = b.y + 90
  const bottom = b.y + b.h - 30
  const py = (v: number): number => bottom - ((v - lo) / (hi - lo)) * (bottom - top)
  const color = (d: Paired): string => {
    if (d.label === spec.highlight) return t.accent

    return d.value >= d.previous ? t.palette[2] : t.palette[4]
  }

  for (const [x, word] of [
    [lx, spec.from ?? 'Before'],
    [rx, spec.to ?? 'After']
  ] as const) {
    out.push(text(word, { x, y: b.y + 30, size: 28, weight: 800, fill: t.muted, anchor: 'middle' }))
  }

  for (const x of [lx, rx]) {
    out.push(
      `<rect x="${x - 1}" y="${top - 20}" width="2" height="${bottom - top + 20}" fill="${t.faint}"/>`
    )
  }

  for (const d of items) {
    const on = d.label === spec.highlight

    out.push(
      `<path d="M${lx},${py(d.previous)}L${rx},${py(d.value)}" stroke="${color(d)}" stroke-width="${on ? 8 : 5}" fill="none" opacity="${spec.highlight && !on ? 0.55 : 1}"/>`
    )
    out.push(`<circle cx="${lx}" cy="${py(d.previous)}" r="8" fill="${color(d)}"/>`)
    out.push(`<circle cx="${rx}" cy="${py(d.value)}" r="8" fill="${color(d)}"/>`)
  }

  const left: Slot[] = items.map((d) => ({ d, y: py(d.previous) }))
  const right: Slot[] = items.map((d) => ({ d, y: py(d.value) }))

  dodge(left, { gap: 40, lo: top - 10, hi: bottom + 10 })
  dodge(right, { gap: 40, lo: top - 10, hi: bottom + 10 })
  for (const l of left) {
    out.push(
      text(`${l.d.label}  ${fmt(l.d.previous)}`, {
        x: lx - 20,
        y: l.y + 9,
        size: 24,
        weight: 700,
        fill: t.text,
        anchor: 'end'
      })
    )
  }

  for (const r of right) {
    out.push(
      text(`${fmt(r.d.value)}  ${r.d.label}`, {
        x: rx + 20,
        y: r.y + 9,
        size: 24,
        weight: 700,
        fill: color(r.d)
      })
    )
  }
}
