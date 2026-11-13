import { callout, W, type Draw, type Place } from '../frame.ts'
import { ceiling, type Rect } from '../geometry.ts'
import { geoMap, type GeoMap, type GeoRegion } from '../places.ts'
import type { Chart, Row } from '../spec.ts'
import { halo, text } from '../svg.ts'
import { contrast, ramp, type Ramp } from '../themes.ts'

const byValue = (data: ReadonlyArray<Row>): Row[] => [...data].sort((a, c) => c.value - a.value)
// Map charts are only picked when the host passed map data, so a missing one is a bug upstream.
function atlas(spec: Chart): GeoMap {
  if (!spec.maps) {
    throw new Error(`${spec.type} needs the map data from qvac-charts/maps`)
  }

  return geoMap(spec.maps, spec.map)
}

interface Fit {
  k: number
  x: number
  y: number
}

// The map scaled into the chart's width and at most this share of its height, centred.
const MAP_SHARE = 0.62

function fitted({ spec, b }: Draw): Fit {
  const map = atlas(spec)
  const k = Math.min(b.w / map.width, (b.h * MAP_SHARE) / map.height)

  return { k, x: b.x + (b.w - map.width * k) / 2, y: b.y }
}

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
  const { k, x: ox, y: oy } = fitted(d)
  const top = byValue(spec.data)
  const max = ceiling(top.map((r) => r.value))

  for (const row of top) {
    const r = atlas(spec).regions.find((x) => x.name === row.label)

    if (!r) {
      continue
    }

    const radius = Math.max(5, Math.sqrt(row.value / max) * 64)
    const on = row.label === spec.highlight

    out.push(
      `<circle cx="${ox + r.cx * k}" cy="${oy + r.cy * k}" r="${radius}" fill="${on ? t.accent : t.palette[2]}" fill-opacity="0.82" stroke="${t.bg}" stroke-width="2"/>`
    )
  }

  mapLabels(d, top.slice(0, 5).concat(top.filter((x) => x.label === spec.highlight)))
  placeList(d, {
    area: { x: b.x, y: y + 40, w: b.w, h: b.y + b.h - y - 40 },
    items: top,
    paint: (row) => (row.label === spec.highlight ? t.accent : t.palette[2])
  })
}

// Draws every region of the map and returns where the map ends.
function world(d: Draw, fill: (row: Row | undefined) => string): number {
  const { out, spec, t } = d
  const { k, x, y } = fitted(d)
  const byName = new Map(spec.data.map((row) => [row.label, row]))
  const lit = (r: GeoRegion): boolean => {
    const row = byName.get(r.name)

    return row !== undefined && row.label === spec.highlight
  }
  const regions = atlas(spec).regions

  // The highlight is drawn last so its outline is not covered by a neighbour.
  const shapes = [...regions.filter((r) => !lit(r)), ...regions.filter(lit)].map((r) => {
    const row = byName.get(r.name)
    const on = row && row.label === spec.highlight

    return `<path d="${r.d}" fill="${fill(row)}" stroke="${on ? t.text : t.bg}" stroke-width="${(on ? 2.5 : 0.6) / k}"/>`
  })

  out.push(`<g transform="translate(${x},${y}) scale(${k})">${shapes.join('')}</g>`)

  return y + atlas(spec).height * k
}

// Values on the map for the largest few, skipping any that would land on a label already placed.
function mapLabels(d: Draw, items: ReadonlyArray<Row>): void {
  const { out, spec, t, fmt } = d
  const { k, x: ox, y: oy } = fitted(d)
  const placed: Array<{ x: number; y: number }> = []

  for (const row of new Set(items)) {
    const r = atlas(spec).regions.find((x) => x.name === row.label)

    if (!r) {
      continue
    }

    const x = ox + r.cx * k
    const y = oy + r.cy * k

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

  if (spec.data.length >= atlas(spec).regions.length) {
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
