import { callout, W, type Draw, type Place } from '../frame.ts'
import type { Rect } from '../geometry.ts'
import { TILES, WORLD, regionCount, type GeoRegion } from '../maps/index.ts'
import type { Row } from '../spec.ts'
import { halo, text } from '../svg.ts'
import { contrast, ramp, type Ramp } from '../themes.ts'

const byValue = (data: ReadonlyArray<Row>): Row[] => [...data].sort((a, c) => c.value - a.value)
const find = (label: string): GeoRegion | undefined => WORLD.regions.find((x) => x.name === label)

export function choropleth(d: Draw): void {
  const { spec, t, b } = d
  const shading = ramp(spec.data, t)
  const y = world(d, (row) => (row ? shading.shade(row.value) : t.faint))
  const top = byValue(spec.data)

  mapLabels(d, top.slice(0, 5).concat(top.filter((x) => x.label === spec.highlight)))
  legend(d, { x: b.x, y: y + 28, ramp: shading })
  placeList(d, {
    area: { x: b.x, y: y + 110, w: b.w, h: b.y + b.h - y - 110 },
    items: top,
    paint: (row) => shading.shade(row.value)
  })
}

export function bubbleMap(d: Draw): void {
  const { out, spec, t, b } = d
  const y = world(d, () => t.faint)
  const k = b.w / WORLD.width
  const top = byValue(spec.data)
  const max = top[0].value

  for (const row of top) {
    const r = find(row.label)

    if (!r) {
      continue
    }

    const radius = Math.max(5, Math.sqrt(row.value / max) * 64)
    const on = row.label === spec.highlight

    out.push(
      `<circle cx="${b.x + r.cx * k}" cy="${b.y + r.cy * k}" r="${radius}" fill="${on ? t.accent : t.palette[2]}" fill-opacity="0.82" stroke="${t.bg}" stroke-width="2"/>`
    )
  }

  mapLabels(d, top.slice(0, 5).concat(top.filter((x) => x.label === spec.highlight)))
  placeList(d, {
    area: { x: b.x, y: y + 40, w: b.w, h: b.y + b.h - y - 40 },
    items: top,
    paint: (row) => (row.label === spec.highlight ? t.accent : t.palette[2])
  })
}

export function tiles(d: Draw): void {
  const { out, spec, t, b, fmt } = d
  const shading = ramp(spec.data, t)
  const regions = TILES[spec.map]
  const cols = Math.max(...regions.map((r) => r.col)) + 1
  const rows = Math.max(...regions.map((r) => r.row)) + 1
  const side = Math.min(b.h / rows, (b.w * 0.62) / cols)
  const gap = side * 0.06
  const byCode = new Map(spec.data.map((x) => [x.region, x]))

  for (const r of regions) {
    const row = byCode.get(r.code)
    const x = b.x + r.col * side
    const y = b.y + r.row * side
    const fill = row ? shading.shade(row.value) : t.faint
    const on = row && row.label === spec.highlight
    const ink = row ? contrast(fill, t) : t.muted

    out.push(
      `<rect x="${x + gap / 2}" y="${y + gap / 2}" width="${side - gap}" height="${side - gap}" rx="${side * 0.1}" fill="${fill}"${on ? ` stroke="${t.text}" stroke-width="5"` : ''}/>`
    )
    out.push(
      text(r.code, {
        x: x + side / 2,
        y: y + side * (row ? 0.45 : 0.58),
        size: side * 0.3,
        weight: 800,
        fill: ink,
        anchor: 'middle'
      })
    )
    if (row) {
      out.push(
        text(fmt(row.value, Math.min(spec.decimals, 1)), {
          x: x + side / 2,
          y: y + side * 0.76,
          size: side * 0.19,
          weight: 600,
          fill: ink,
          anchor: 'middle'
        })
      )
    }
  }

  const rx = b.x + cols * side + 48
  const rw = b.x + b.w - rx

  legend(d, { x: rx, y: b.y + 10, ramp: shading, w: rw })
  ranking(d, { x: rx, y: b.y, w: rw })
  callout(d, { x: rx, y: b.y + b.h - 150, w: rw })
}

// The top states beside the grid, by code and full name.
function ranking({ out, spec, t, fmt }: Draw, { x, y: top, w }: Place): void {
  const rows = byValue(spec.data).slice(0, spec.callout ? 5 : 8)

  rows.forEach((row, i) => {
    const y = top + 150 + i * 62
    const on = row.label === spec.highlight

    out.push(
      text(`${i + 1}. ${row.region ?? row.label}`, {
        x,
        y,
        size: 26,
        weight: 800,
        fill: on ? t.accent : t.text
      })
    )
    out.push(
      text(fmt(row.value), {
        x: x + w,
        y,
        size: 26,
        weight: 700,
        fill: on ? t.accent : t.text,
        anchor: 'end'
      })
    )
    out.push(text(row.label, { x, y: y + 26, size: 18, fill: t.muted }))
  })
}

// Draws every country and returns where the map ends.
function world({ out, spec, t, b }: Draw, fill: (row: Row | undefined) => string): number {
  const k = b.w / WORLD.width
  const byName = new Map(spec.data.map((row) => [row.label, row]))
  const shapes = WORLD.regions.map((r) => {
    const row = byName.get(r.name)
    const on = row && row.label === spec.highlight

    return `<path d="${r.d}" fill="${fill(row)}" stroke="${on ? t.text : t.bg}" stroke-width="${(on ? 2.5 : 0.6) / k}"/>`
  })
  const lit = (s: string): number => (s.includes(`stroke="${t.text}"`) ? 1 : 0)

  // The highlight is drawn last so its outline is not covered by a neighbour.
  shapes.sort((a, c) => lit(a) - lit(c))
  out.push(`<g transform="translate(${b.x},${b.y}) scale(${k})">${shapes.join('')}</g>`)

  return b.y + WORLD.height * k
}

// Values on the map for the largest few, skipping any that would land on a label already placed.
function mapLabels({ out, spec, t, b, fmt }: Draw, items: ReadonlyArray<Row>): void {
  const k = b.w / WORLD.width
  const placed: Array<{ x: number; y: number }> = []

  for (const row of new Set(items)) {
    const r = find(row.label)

    if (!r) {
      continue
    }

    const x = b.x + r.cx * k
    const y = b.y + r.cy * k

    if (placed.some((p) => Math.abs(p.x - x) < 90 && Math.abs(p.y - y) < 30)) {
      continue
    }

    placed.push({ x, y })

    const on = row.label === spec.highlight

    out.push(
      halo(fmt(row.value), {
        x,
        y: y + 8,
        size: on ? 28 : 24,
        weight: 800,
        fill: t.text,
        anchor: 'middle',
        stroke: t.bg
      })
    )
  }
}

interface Legend {
  x: number
  y: number
  ramp: Ramp
  w?: number
}

function legend(
  { out, spec, t, fmt }: Draw,
  { x, y, ramp: { shade, lo, hi }, w = 360 }: Legend
): void {
  const id = `ramp${spec.map}`

  out.push(
    `<defs><linearGradient id="${id}"><stop offset="0" stop-color="${shade(lo)}"/><stop offset="1" stop-color="${shade(hi)}"/></linearGradient></defs>`
  )
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="18" rx="9" fill="url(#${id})"/>`)
  out.push(text(fmt(lo), { x, y: y + 50, size: 22, weight: 700, fill: t.muted }))
  out.push(
    text(fmt(hi), { x: x + w, y: y + 50, size: 22, weight: 700, fill: t.muted, anchor: 'end' })
  )

  if (spec.data.length >= regionCount(spec.map)) {
    return
  }

  const [nx, ny] = x + w + 200 < W ? [x + w + 40, y] : [x, y + 78]

  out.push(`<rect x="${nx}" y="${ny}" width="18" height="18" rx="4" fill="${t.faint}"/>`)
  out.push(text('No data', { x: nx + 28, y: ny + 16, size: 22, fill: t.muted }))
}

interface PlaceList {
  area: Rect
  items: ReadonlyArray<Row>
  paint: (row: Row) => string
}

// Every value, in columns, so a country too small to see on the map is still read.
function placeList({ out, spec, t, fmt }: Draw, { area: b, items, paint }: PlaceList): void {
  const cols = items.length <= 8 ? 2 : 3
  const rows = Math.ceil(items.length / cols)
  const rowH = Math.min(52, b.h / rows)
  const size = Math.min(26, rowH * 0.56)
  const cw = b.w / cols

  items.forEach((row, i) => {
    const x = b.x + Math.floor(i / rows) * cw
    const y = b.y + (i % rows) * rowH + rowH / 2
    const on = row.label === spec.highlight
    const room = Math.floor(
      (cw - 28 - size * 1.4 - (fmt(row.value).length + 1) * size * 0.6) / (size * 0.56)
    )
    const label = row.label.length > room ? row.label.slice(0, room - 1).trimEnd() + '…' : row.label

    out.push(
      `<rect x="${x}" y="${y - size * 0.45}" width="${size * 0.9}" height="${size * 0.9}" rx="4" fill="${paint(row)}"/>`
    )
    out.push(
      text(label, {
        x: x + size * 1.4,
        y: y + size * 0.36,
        size,
        weight: on ? 800 : 500,
        fill: on ? t.accent : t.text
      })
    )
    out.push(
      text(fmt(row.value), {
        x: x + cw - 28,
        y: y + size * 0.36,
        size,
        weight: 800,
        fill: on ? t.accent : t.text,
        anchor: 'end'
      })
    )
  })
}
