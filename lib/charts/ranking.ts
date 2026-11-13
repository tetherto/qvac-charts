import { callout, type Draw } from '../frame.ts'
import { stroke } from '../geometry.ts'
import { text } from '../svg.ts'

export function rankedBar(d: Draw): void {
  const { out, spec, t, b, fmt } = d
  const rows = [...spec.data].sort((a, c) => c.value - a.value)
  const hl = spec.highlight ?? rows[0].label
  const max = rows[0].value
  const rowH = Math.min(86, b.h / rows.length)
  const labelW = Math.min(300, Math.max(...rows.map((r) => r.label.length)) * 30 * 0.56)
  const x0 = b.x + 64 + labelW + 20
  const span = b.x + b.w - x0 - 170

  rows.forEach((r, i) => {
    const cy = b.y + i * rowH + rowH / 2
    const on = r.label === hl
    const w = Math.max(6, (r.value / max) * span)
    const fill = on ? t.accent : t.base

    out.push(`<circle cx="${b.x + 22}" cy="${cy}" r="22" fill="${on ? t.accent : t.faint}"/>`)
    out.push(
      text(String(i + 1), {
        x: b.x + 22,
        y: cy + 8,
        size: 22,
        weight: 800,
        fill: on ? t.bg : t.muted,
        anchor: 'middle'
      })
    )
    out.push(
      text(r.label, { x: b.x + 64, y: cy + 10, size: 30, weight: on ? 800 : 500, fill: t.text })
    )
    out.push(
      `<rect x="${x0}" y="${cy - rowH * 0.31}" width="${w}" height="${rowH * 0.62}" rx="6" fill="${fill}"/>`
    )
    out.push(
      text(fmt(r.value), {
        x: x0 + w + 14,
        y: cy + 10,
        size: 30,
        weight: 800,
        fill: on ? t.accent : t.text
      })
    )
  })
  callout(d, { x: b.x + b.w / 2, y: b.y + b.h - 150, w: b.w / 2 })
}

export function radial({ out, spec, t, b, fmt }: Draw): void {
  const rows = [...spec.data].sort((a, c) => c.value - a.value)
  const max = rows[0].value
  const R = Math.min(b.w / 2, b.h / 2) - 10
  const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  const band = (R * 0.78) / rows.length

  rows.forEach((d, i) => {
    const r = R - i * band - band / 2
    const on = d.label === (spec.highlight ?? rows[0].label)
    const color = on ? t.accent : t.palette[(i + 1) % t.palette.length]
    const sw = band * 0.7
    const size = Math.min(26, band * 0.42)

    out.push(
      `<path d="${stroke(c, { r, from: 0, to: 270 })}" stroke="${t.faint}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`
    )
    out.push(
      `<path d="${stroke(c, { r, from: 0, to: Math.max(2, (d.value / max) * 270) })}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`
    )
    out.push(
      text(`${d.label}  ${fmt(d.value)}`, {
        x: c.x - 18,
        y: c.y - r + size * 0.36,
        size,
        weight: on ? 800 : 600,
        fill: on ? t.accent : t.text,
        anchor: 'end'
      })
    )
  })
}
