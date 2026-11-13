import { callout, type Draw } from '../frame.ts'
import { arc, bounds, dodge, largestRemainder, pack, polar, squarify } from '../geometry.ts'
import type { Row } from '../spec.ts'
import { text, wrap } from '../svg.ts'
import { colors } from '../themes.ts'

const byValue = (data: ReadonlyArray<Row>): Row[] => [...data].sort((a, c) => c.value - a.value)
const sum = (data: ReadonlyArray<Row>): number => data.reduce((s, d) => s + d.value, 0)

export function bubbles(d: Draw): void {
  const { out, spec, t, b, fmt } = d
  const items = byValue(spec.data)
  const color = colors(items, { t, highlight: spec.highlight })
  const circles = pack(
    items.map((x) => Math.sqrt(x.value)),
    0.04
  )
  const box = bounds(circles)
  const avail = spec.callout ? b.h - 190 : b.h
  const k = Math.min(b.w / (box.x1 - box.x0), avail / (box.y1 - box.y0))
  const ox = b.x + (b.w - (box.x1 - box.x0) * k) / 2 - box.x0 * k
  const oy = b.y + (avail - (box.y1 - box.y0) * k) / 2 - box.y0 * k

  circles.forEach((c, i) => {
    const item = items[i]
    const cx = ox + c.x * k
    const cy = oy + c.y * k
    const r = c.r * k

    out.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color(item)}"/>`)
    out.push(...bubbleLabel(d, { item, cx, cy, r }))
  })
  callout(d, { x: b.x, y: b.y + b.h - 150, w: b.w })
}

interface Bubble {
  item: Row
  cx: number
  cy: number
  r: number
}

// Name and value inside a bubble large enough to hold them, under it otherwise.
function bubbleLabel({ t, fmt }: Draw, { item, cx, cy, r }: Bubble): string[] {
  if (r > 70) {
    const size = Math.min(56, r / 3.2)

    return [
      text(item.label, {
        x: cx,
        y: cy - size * 0.1,
        size,
        weight: 800,
        fill: t.bg,
        anchor: 'middle'
      }),
      text(fmt(item.value), {
        x: cx,
        y: cy + size * 0.95,
        size: size * 0.7,
        weight: 500,
        fill: t.bg,
        anchor: 'middle'
      })
    ]
  }

  if (r > 34) {
    const size = Math.max(16, Math.min(26, r / 2.4))

    return [
      text(item.label, { x: cx, y: cy, size, weight: 800, fill: t.bg, anchor: 'middle' }),
      text(fmt(item.value), {
        x: cx,
        y: cy + size,
        size: size * 0.8,
        weight: 500,
        fill: t.bg,
        anchor: 'middle'
      })
    ]
  }

  return [
    text(`${item.label} ${fmt(item.value)}`, {
      x: cx,
      y: cy + r + 24,
      size: 20,
      weight: 700,
      fill: t.muted,
      anchor: 'middle'
    })
  ]
}

export function treemap({ out, spec, t, b }: Draw): void {
  const items = byValue(spec.data)
  const color = colors(items, { t, highlight: spec.highlight })
  const total = sum(items)
  const groups = [...new Set(items.map((d) => d.group).filter((g): g is string => Boolean(g)))]
  let top = b.y

  // One group explains nothing, and its swatch could match no cell: cells are coloured per item then.
  if (groups.length > 1) {
    let x = b.x

    for (const g of groups) {
      out.push(
        `<rect x="${x}" y="${top}" width="22" height="22" rx="4" fill="${color({ group: g })}"/>`
      )
      out.push(text(g, { x: x + 32, y: top + 19, size: 24, fill: t.text }))
      x += 32 + g.length * 24 * 0.56 + 36
    }

    top += 48
  }

  const cells = squarify(
    items.map((d) => d.value),
    { x: b.x, y: top, w: b.w, h: b.y + b.h - top }
  )

  cells.forEach((c, i) => {
    const d = items[i]
    const g = 3
    const share = ((d.value / total) * 100).toFixed(1) + '%'
    const size = Math.max(18, Math.min(64, Math.sqrt(c.w * c.h) / 5.5))

    out.push(
      `<rect x="${c.x + g}" y="${c.y + g}" width="${c.w - 2 * g}" height="${c.h - 2 * g}" rx="6" fill="${color(d)}"/>`
    )
    if (c.w > size * 3 && c.h > size * 2.2) {
      out.push(text(share, { x: c.x + 18, y: c.y + 18 + size, size, weight: 800, fill: t.bg }))
      out.push(
        text(d.label, {
          x: c.x + 18,
          y: c.y + 26 + size + size * 0.6,
          size: size * 0.5,
          weight: 700,
          fill: t.bg
        })
      )
    } else if (c.w > 60 && c.h > 40) {
      out.push(text(share, { x: c.x + 12, y: c.y + 32, size: 20, weight: 800, fill: t.bg }))
    }
  })
}

interface Label {
  d: Row
  mid: number
  x: number
  y: number
  right: boolean
}

export function donut(draw: Draw): void {
  const { out, spec, t, b } = draw
  const items = byValue(spec.data)
  const color = colors(items, { t, highlight: spec.highlight })
  const total = sum(items)
  const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  const R = Math.min(b.w / 2 - 200, b.h / 2 - 40)
  const r = R * 0.6
  const labels: Label[] = []
  let a = 0

  for (const d of items) {
    const sweep = (d.value / total) * 360
    const mid = a + sweep / 2
    const [lx, ly] = polar(c, { r: R + 46, deg: mid })

    out.push(
      `<path d="${arc(c, { outer: R, inner: r, from: a, to: a + sweep })}" fill="${color(d)}" stroke="${t.bg}" stroke-width="4"/>`
    )
    labels.push({ d, mid, x: lx, y: ly, right: mid < 180 })
    a += sweep
  }

  for (const side of [true, false]) {
    const group = labels.filter((l) => l.right === side)

    dodge(group, { gap: 74, lo: b.y + 20, hi: b.y + b.h - 20 })
    for (const l of group) {
      out.push(...sliceLabel(draw, { l, c, R, total }))
    }
  }

  const focus = items.find((d) => d.label === spec.highlight) ?? items[0]
  const share = Math.round((focus.value / total) * 100) + '%'

  out.push(
    text(share, {
      x: c.x,
      y: c.y + 10,
      size: r * 0.55,
      weight: 800,
      fill: color(focus),
      anchor: 'middle',
      spacing: -2
    })
  )
  wrap(focus.label, { width: r * 1.5, size: 24 })
    .slice(0, 2)
    .forEach((line, i) =>
      out.push(
        text(line, {
          x: c.x,
          y: c.y + 10 + r * 0.25 + i * 30,
          size: 24,
          fill: t.text,
          anchor: 'middle'
        })
      )
    )
}

interface SliceLabel {
  l: Label
  c: { x: number; y: number }
  R: number
  total: number
}

// A leader line from the ring to the label, then the name and its share.
function sliceLabel({ spec, t, fmt }: Draw, { l, c, R, total }: SliceLabel): string[] {
  const [ex, ey] = polar(c, { r: R + 8, deg: l.mid })
  const tx = l.right ? Math.max(l.x, c.x + 40) : Math.min(l.x, c.x - 40)
  const anchor = l.right ? 'start' : 'end'
  const ox = l.right ? tx + 8 : tx - 8
  const share = Math.round((l.d.value / total) * 100) + '%'
  const detail = spec.suffix === '%' ? share : `${share} · ${fmt(l.d.value)}`

  return [
    `<path d="M${ex},${ey}L${tx},${l.y - 8}" stroke="${t.muted}" stroke-width="1.5" fill="none"/>`,
    text(l.d.label, { x: ox, y: l.y - 2, size: 26, weight: 800, fill: t.text, anchor }),
    text(detail, { x: ox, y: l.y + 26, size: 22, fill: t.muted, anchor })
  ]
}

export function waffle({ out, spec, t, b, fmt }: Draw): void {
  const items = byValue(spec.data)
  const focus = items.find((d) => d.label === spec.highlight) ?? items[0]
  const ordered = [focus, ...items.filter((d) => d !== focus)]
  const total = sum(items)
  const cells = largestRemainder(ordered.map((d) => (d.value / total) * 100))
  const fill = (d: Row, i: number): string => {
    if (d === focus) return t.accent

    return items.length === 2 ? t.base : t.palette[(i + 1) % t.palette.length]
  }
  const legendH = Math.ceil(ordered.length / 2) * 110
  const side = Math.min(b.w, b.h - legendH - 30)
  const step = side / 10
  const gx = b.x + (b.w - side) / 2
  let k = 0

  ordered.forEach((d, i) => {
    for (let c = 0; c < cells[i]; c++, k++) {
      const x = gx + (k % 10) * step
      const y = b.y + Math.floor(k / 10) * step

      out.push(
        `<rect x="${x + 4}" y="${y + 4}" width="${step - 8}" height="${step - 8}" rx="${step * 0.18}" fill="${fill(d, i)}"/>`
      )
    }
  })

  const ly = b.y + side + 40

  ordered.forEach((d, i) => {
    const x = b.x + (i % 2) * (b.w / 2)
    const y = ly + Math.floor(i / 2) * 110

    out.push(
      text(cells[i] + '%', { x, y: y + 56, size: 64, weight: 800, fill: fill(d, i), spacing: -2 })
    )
    out.push(text(d.label, { x: x + 170, y: y + 34, size: 26, weight: 800, fill: t.text }))
    if (spec.suffix !== '%') {
      out.push(text(fmt(d.value), { x: x + 170, y: y + 64, size: 22, fill: t.muted }))
    }
  })
}

export function stacked({ out, spec, t, b }: Draw): void {
  const rows = [...new Set(spec.data.map((d) => d.label))]
  const parts = [...new Set(spec.data.map((d) => d.group ?? ''))]
  const color = (p: string, i: number): string =>
    p === spec.highlight ? t.accent : t.palette[(i + 1) % t.palette.length]
  let x = b.x

  parts.forEach((p, i) => {
    out.push(`<rect x="${x}" y="${b.y}" width="22" height="22" rx="4" fill="${color(p, i)}"/>`)
    out.push(text(p, { x: x + 32, y: b.y + 19, size: 24, fill: t.text }))
    x += 32 + p.length * 24 * 0.56 + 36
  })

  const top = b.y + 70
  const rowH = Math.min(110, (b.h - 70) / rows.length)
  const labelW = Math.min(240, Math.max(...rows.map((r) => r.length)) * 28 * 0.56) + 24
  const x0 = b.x + labelW
  const span = b.w - labelW

  rows.forEach((r, ri) => {
    const cy = top + ri * rowH + rowH / 2
    const cells = parts.map(
      (p) => spec.data.find((d) => d.label === r && (d.group ?? '') === p)?.value ?? 0
    )
    const total = cells.reduce((s, v) => s + v, 0) || 1
    let cx = x0

    out.push(text(r, { x: b.x, y: cy + 10, size: 28, weight: 700, fill: t.text }))
    cells.forEach((v, pi) => {
      const w = (v / total) * span

      if (w <= 0) {
        return
      }

      out.push(
        `<rect x="${cx + 1.5}" y="${cy - rowH * 0.34}" width="${Math.max(0, w - 3)}" height="${rowH * 0.68}" rx="4" fill="${color(parts[pi], pi)}"/>`
      )
      if (w > 70) {
        out.push(
          text(Math.round((v / total) * 100) + '%', {
            x: cx + w / 2,
            y: cy + 9,
            size: 24,
            weight: 800,
            fill: t.bg,
            anchor: 'middle'
          })
        )
      }

      cx += w
    })
  })
}
