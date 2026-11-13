import { MAPS, region, mapFor } from './maps/index.js'

const W = 1080
const H = 1350
const M = 72
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const themes = {
  dark: {
    bg: '#0c1824',
    text: '#f4efe6',
    muted: '#8fa3b8',
    faint: 'rgba(244,239,230,0.10)',
    accent: '#ffb703',
    base: '#3a5a7a',
    palette: [
      '#ffb703',
      '#fb8500',
      '#2a9d8f',
      '#8ecae6',
      '#e63946',
      '#219ebc',
      '#cdb4db',
      '#a7c957'
    ]
  },
  light: {
    bg: '#f5efe3',
    text: '#14213d',
    muted: '#5c677d',
    faint: 'rgba(20,33,61,0.10)',
    accent: '#e63946',
    base: '#9aa9bd',
    palette: [
      '#e63946',
      '#f4a261',
      '#2a9d8f',
      '#457b9d',
      '#1d3557',
      '#e9c46a',
      '#8d99ae',
      '#6d597a'
    ]
  }
}

const prefixes = { dollars: '$', euros: '€', pounds: '£', reais: 'R$' }
const scales = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }
const scaleWords = { ones: '', thousands: 'K', millions: 'M', billions: 'B', trillions: 'T' }

export function render(input, { theme = 'dark' } = {}) {
  const f = frame(input, { theme })
  const out = []
  charts[f.spec.type](out, f.spec, f.t, f.box, f.fmt)
  return f.close(out.join(''))
}

// Header, footer and the box between them, so another engine can draw the body.
export function frame(input, { theme = 'dark' } = {}) {
  const spec = normalize(input)
  const t = themes[theme]
  const fmt = (v, decimals = spec.decimals) =>
    (v < 0 ? '-' : '') +
    (spec.prefix ?? '') +
    Math.abs(v).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }) +
    (spec.suffix ?? '')

  const out = []
  const y = header(out, spec, t)
  const box = { x: M, y: y + 24, w: W - 2 * M, h: H - 150 - (y + 24) }
  footer(out, spec, t)
  const close = (body) =>
    fixed(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">` +
        `<rect width="${W}" height="${H}" fill="${t.bg}"/>` +
        out.join('') +
        body +
        '</svg>'
    )

  return { spec, t, box, fmt, close }
}

// Bare and Node disagree on the last bit of sin and cos; two decimals in attributes keep the SVG identical.
function fixed(svg) {
  return svg.replace(/="[^"]*"/g, (attr) =>
    attr.replace(/-?\d+\.\d{3,}/g, (n) => String(Math.round(Number(n) * 100) / 100))
  )
}

// Derived numbers are computed here, never taken from the model: small models get the arithmetic wrong.
export function normalize(spec) {
  spec = unswap(spec)
  if (spec.shape === 'places') {
    spec = places(spec)
  }
  if (spec.shape === 'change' && !spec.data.some((d) => d.previous !== undefined)) {
    spec = pairs(spec)
  }

  const notes = new Map((spec.annotations ?? []).map((a) => [a.label, a.text]))
  // Back to base units first, so "4800 thousands" is shown as 4.8M, not 4,800K.
  const raw = Math.max(...spec.data.map((d) => Math.abs(d.value)))
  const named =
    spec.unit === 'percent' ? 1 : (scales[scaleWords[spec.scale]] ?? scales[spec.scale] ?? 1)
  // Nobody writes "1,460,000,000 million": numbers that large are already in full.
  const given = raw >= 1e5 ? 1 : named
  const max = raw * given
  const rescale = max >= 1e4 ? [1e12, 1e9, 1e6, 1e3].find((s) => max >= s) : 1
  const k = given / rescale
  const data = spec.data.map((d) => ({
    ...d,
    value: d.value * k,
    ...(d.previous !== undefined && { previous: d.previous * k }),
    ...(notes.has(d.label) && { note: notes.get(d.label) })
  }))
  const names = new Set(data.flatMap((d) => [d.label, d.group]))
  const highlight = names.has(spec.highlight) ? spec.highlight : undefined
  const callout =
    typeof spec.callout === 'string' ? derive(spec.callout, data, highlight) : spec.callout
  const scaled =
    given !== 1 || rescale !== 1
      ? (Object.entries(scales).find(([, s]) => s === rescale)?.[0] ?? '')
      : undefined
  const scale = scaled ?? scaleWords[spec.scale] ?? (spec.scale === 'none' ? '' : spec.scale)
  const units = spec.unit
    ? { prefix: prefixes[spec.unit] ?? '', suffix: spec.unit === 'percent' ? '%' : (scale ?? '') }
    : { prefix: spec.prefix, suffix: scaled ?? spec.suffix }
  const top = Math.max(...data.map((d) => Math.abs(d.value)))
  const fractional = data.some((d) => !Number.isInteger(d.value))
  const decimals =
    scaled !== undefined
      ? top < 10
        ? 2
        : top < 100
          ? 1
          : 0
      : (spec.decimals ?? (fractional && top < 1000 ? 1 : 0))
  const type = pick(spec, data)
  const parts = [
    'donut',
    'waffle',
    'treemap',
    'bubbles',
    'stacked',
    'choropleth',
    'bubble-map',
    'tiles'
  ]

  return {
    ...spec,
    ...units,
    decimals,
    type,
    data,
    highlight,
    callout: spec.callout === 'share' && !parts.includes(type) ? undefined : callout
  }
}

const PERIOD = /^(\d{4}|q[1-4]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i

// Periods filed as series and series as labels: two periods are a change, more are swapped back.
function unswap(spec) {
  if (spec.shape !== 'over-time') return spec
  const groups = [...new Set(spec.data.map((d) => d.group).filter(Boolean))]
  if (
    groups.length < 2 ||
    !groups.every((g) => PERIOD.test(g)) ||
    spec.data.some((d) => PERIOD.test(d.label))
  ) {
    return spec
  }

  if (groups.length === 2) {
    return { ...spec, shape: 'change' }
  }

  return { ...spec, data: spec.data.map((d) => ({ ...d, label: d.group, group: d.label })) }
}

// Labels arrive as any name the model wrote ("USA", "Vietnã", "SP"); the map draws one region per canonical name.
// A name the map does not know stays in the list but is not drawn.
function places(spec) {
  const map = mapFor(spec.data.map((d) => d.label))
  const m = MAPS[map]
  const canonical = (label) => {
    const id = region(map, label)
    return m.kind === 'tiles' ? m.regions.find((r) => r.code === id)?.name : id
  }
  const seen = new Set()
  const data = []
  for (const d of spec.data) {
    const label = canonical(d.label) ?? d.label
    if (seen.has(label)) {
      continue
    }
    seen.add(label)
    data.push({ ...d, label, region: region(map, d.label) })
  }

  return {
    ...spec,
    map,
    data,
    highlight: canonical(spec.highlight) ?? spec.highlight,
    annotations: []
  }
}

// A change arrives as each item twice, grouped by moment; the slope wants one row per item.
function pairs(spec) {
  const [from, to] = [...new Set(spec.data.map((d) => d.group))].sort()
  const items = [...new Set(spec.data.map((d) => d.label))]
  const at = (label, g) => spec.data.find((d) => d.label === label && d.group === g)?.value
  const data = items
    .map((label) => ({ label, previous: at(label, from), value: at(label, to) }))
    .filter((d) => d.previous !== undefined && d.value !== undefined)

  return { ...spec, from, to, data }
}

// The model names the shape of its data; the chart is chosen here, from the data itself.
function pick(spec, data) {
  if (spec.type) return spec.type
  const v = spec.variant
  const n = data.length
  const series =
    new Set(data.map((d) => d.group).filter(Boolean)).size > 1 &&
    new Set(data.map((d) => d.label)).size < n
  if (spec.shape === 'places') {
    return MAPS[spec.map].kind === 'tiles' ? 'tiles' : v === 'bubbles' ? 'bubble-map' : 'choropleth'
  }

  if (spec.shape === 'ranking') {
    return v === 'radial' && n <= 10 ? 'radial' : 'ranked-bar'
  }
  if (spec.shape === 'sizes') {
    return 'bubbles'
  }
  if (spec.shape === 'change') {
    return data.some((d) => d.previous !== undefined) ? 'slope' : 'ranked-bar'
  }

  if (spec.shape === 'over-time') {
    if (series) {
      return 'multi-line'
    }
    if (v === 'column' || v === 'line') {
      return v
    }
    return n <= 6 && !spec.annotations?.length ? 'column' : 'line'
  }

  if (series || v === 'stacked') {
    return series ? 'stacked' : 'treemap'
  }
  if (v === 'waffle' && n <= 5) {
    return 'waffle'
  }
  if (v === 'donut' && n <= 7) {
    return 'donut'
  }
  if (v === 'treemap' || v === 'bubbles') {
    return v
  }
  if (n <= 2) {
    return 'waffle'
  }

  return n <= 5 ? 'donut' : 'treemap'
}

function derive(kind, data, highlight) {
  const sorted = [...data].sort((a, b) => b.value - a.value)
  if (kind === 'share') {
    const total = data.reduce((s, d) => s + d.value, 0)
    const d = data.find((x) => x.label === highlight) ?? sorted[0]
    return { value: Math.round((d.value / total) * 100) + '%', text: `of the total is ${d.label}` }
  }

  if (kind === 'growth') {
    const [a, b] = [data[0], data[data.length - 1]]
    const x = b.value / a.value
    const value =
      x >= 10 ? x.toFixed(0) + '×' : (x >= 1 ? '+' : '') + Math.round((x - 1) * 100) + '%'

    return { value, text: `from ${a.label} to ${b.label}` }
  }

  if (kind === 'ratio') {
    const [a, b] = sorted
    if (a.value / b.value < 1.5) {
      return undefined
    }
    return {
      value: (a.value / b.value).toFixed(1) + '×',
      text: `${a.label} compared with ${b.label}`
    }
  }
}

function header(out, spec, t) {
  let y = M + 56
  for (const line of wrap(spec.title, W - 2 * M, 66)) {
    out.push(text(M, y, line, { size: 66, weight: 800, fill: t.text, spacing: -1 }))
    y += 72
  }

  y += 4
  for (const line of wrap(spec.subtitle, W - 2 * M, 30)) {
    out.push(text(M, y, line, { size: 30, fill: t.muted }))
    y += 40
  }

  return y
}

function footer(out, spec, t) {
  const y = H - 112
  out.push(`<rect x="${M}" y="${y}" width="${W - 2 * M}" height="2" fill="${t.faint}"/>`)
  const lines = wrap('Source: ' + spec.source, W - 2 * M, 20).slice(0, 2)
  lines.forEach((line, i) => out.push(text(M, y + 44 + i * 28, line, { size: 20, fill: t.muted })))
}

function callout(out, spec, t, x, y, w) {
  if (!spec.callout) return
  out.push(
    text(x + w, y, spec.callout.value, {
      size: 120,
      weight: 800,
      fill: t.accent,
      anchor: 'end',
      spacing: -3
    })
  )
  wrap(spec.callout.text, w, 26).forEach((line, i) =>
    out.push(text(x + w, y + 46 + i * 34, line, { size: 26, fill: t.text, anchor: 'end' }))
  )
}

const charts = {
  'ranked-bar'(out, spec, t, b, fmt) {
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
        text(b.x + 22, cy + 8, String(i + 1), {
          size: 22,
          weight: 800,
          fill: on ? t.bg : t.muted,
          anchor: 'middle'
        })
      )
      out.push(text(b.x + 64, cy + 10, r.label, { size: 30, weight: on ? 800 : 500, fill: t.text }))
      out.push(
        `<rect x="${x0}" y="${cy - rowH * 0.31}" width="${w}" height="${rowH * 0.62}" rx="6" fill="${fill}"/>`
      )
      out.push(
        text(x0 + w + 14, cy + 10, fmt(r.value), {
          size: 30,
          weight: 800,
          fill: on ? t.accent : t.text
        })
      )
    })
    callout(out, spec, t, b.x + b.w / 2, b.y + b.h - 150, b.w / 2)
  },

  bubbles(out, spec, t, b, fmt) {
    const items = [...spec.data].sort((a, c) => c.value - a.value)
    const color = colors(items, spec, t)
    const circles = pack(
      items.map((d) => Math.sqrt(d.value)),
      0.04
    )
    const box = bounds(circles)
    const avail = spec.callout ? b.h - 190 : b.h
    const k = Math.min(b.w / (box.x1 - box.x0), avail / (box.y1 - box.y0))
    const ox = b.x + (b.w - (box.x1 - box.x0) * k) / 2 - box.x0 * k
    const oy = b.y + (avail - (box.y1 - box.y0) * k) / 2 - box.y0 * k

    circles.forEach((c, i) => {
      const d = items[i]
      const cx = ox + c.x * k
      const cy = oy + c.y * k
      const r = c.r * k
      out.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color(d)}"/>`)
      if (r > 70) {
        const size = Math.min(56, r / 3.2)
        out.push(
          text(cx, cy - size * 0.1, d.label, { size, weight: 800, fill: t.bg, anchor: 'middle' })
        )
        out.push(
          text(cx, cy + size * 0.95, fmt(d.value), {
            size: size * 0.7,
            weight: 500,
            fill: t.bg,
            anchor: 'middle'
          })
        )
      } else if (r > 34) {
        const size = Math.max(16, Math.min(26, r / 2.4))
        out.push(text(cx, cy, d.label, { size, weight: 800, fill: t.bg, anchor: 'middle' }))
        out.push(
          text(cx, cy + size, fmt(d.value), {
            size: size * 0.8,
            weight: 500,
            fill: t.bg,
            anchor: 'middle'
          })
        )
      } else {
        out.push(
          text(cx, cy + r + 24, `${d.label} ${fmt(d.value)}`, {
            size: 20,
            weight: 700,
            fill: t.muted,
            anchor: 'middle'
          })
        )
      }
    })
    callout(out, spec, t, b.x, b.y + b.h - 150, b.w)
  },

  treemap(out, spec, t, b, fmt) {
    const items = [...spec.data].sort((a, c) => c.value - a.value)
    const color = colors(items, spec, t)
    const total = items.reduce((s, d) => s + d.value, 0)
    const groups = [...new Set(items.map((d) => d.group).filter(Boolean))]
    let top = b.y
    if (groups.length) {
      let x = b.x
      for (const g of groups) {
        out.push(
          `<rect x="${x}" y="${top}" width="22" height="22" rx="4" fill="${color({ group: g })}"/>`
        )
        out.push(text(x + 32, top + 19, g, { size: 24, fill: t.text }))
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
      out.push(
        `<rect x="${c.x + g}" y="${c.y + g}" width="${c.w - 2 * g}" height="${c.h - 2 * g}" rx="6" fill="${color(d)}"/>`
      )
      const share = ((d.value / total) * 100).toFixed(1) + '%'
      const size = Math.max(18, Math.min(64, Math.sqrt(c.w * c.h) / 5.5))
      if (c.w > size * 3 && c.h > size * 2.2) {
        out.push(text(c.x + 18, c.y + 18 + size, share, { size, weight: 800, fill: t.bg }))
        out.push(
          text(c.x + 18, c.y + 26 + size + size * 0.6, d.label, {
            size: size * 0.5,
            weight: 700,
            fill: t.bg
          })
        )
      } else if (c.w > 60 && c.h > 40) {
        out.push(text(c.x + 12, c.y + 32, share, { size: 20, weight: 800, fill: t.bg }))
      }
    })
  },

  line(out, spec, t, b, fmt) {
    const pts = spec.data
    const max = Math.max(...pts.map((d) => d.value)) * 1.12
    const pad = { l: 90, r: 40, t: 160, b: 60 }
    const px = (i) => b.x + pad.l + (i * (b.w - pad.l - pad.r)) / (pts.length - 1)
    const py = (v) => b.y + b.h - pad.b - (v / max) * (b.h - pad.t - pad.b)

    const tk = ticks(max)
    const td = tk.some((v) => !Number.isInteger(v)) ? 1 : 0
    for (const v of tk) {
      out.push(
        `<rect x="${b.x + pad.l}" y="${py(v)}" width="${b.w - pad.l - pad.r}" height="1.5" fill="${t.faint}"/>`
      )
      out.push(
        text(b.x + pad.l - 14, py(v) + 8, fmt(v, td), { size: 22, fill: t.muted, anchor: 'end' })
      )
    }

    pts.forEach((d, i) =>
      out.push(
        text(px(i), b.y + b.h - pad.b + 40, d.label, { size: 24, fill: t.muted, anchor: 'middle' })
      )
    )

    const path = pts.map((d, i) => `${i ? 'L' : 'M'}${px(i)},${py(d.value)}`).join('')
    out.push(
      `<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.accent}" stop-opacity="0.45"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient></defs>`
    )
    out.push(
      `<path d="${path}L${px(pts.length - 1)},${py(0)}L${px(0)},${py(0)}Z" fill="url(#area)"/>`
    )
    out.push(
      `<path d="${path}" fill="none" stroke="${t.accent}" stroke-width="6" stroke-linejoin="round"/>`
    )

    pts.forEach((d, i) => {
      out.push(
        `<circle cx="${px(i)}" cy="${py(d.value)}" r="8" fill="${t.bg}" stroke="${t.accent}" stroke-width="5"/>`
      )
      if (!d.note) {
        return
      }
      const x = px(i)
      const anchor = i > pts.length * 0.6 ? 'end' : 'start'
      const lines = wrap(d.note, 300, 22)
      const tx = anchor === 'end' ? x - 12 : x + 12
      // Clear the line under the whole text block, not just the annotated point.
      const x1 = anchor === 'end' ? tx - 300 : tx + 300
      const under = pts.filter(
        (_, j) => (px(j) - tx) * (px(j) - x1) <= 0 || j === i + (anchor === 'end' ? -1 : 1)
      )
      const peak = Math.min(...under.map((p) => py(p.value)), py(d.value))
      const top = Math.max(b.y, peak - 50 - lines.length * 28 - 34)
      out.push(
        `<rect x="${x - 1}" y="${top + 12}" width="2" height="${py(d.value) - top - 22}" fill="${t.muted}"/>`
      )
      out.push(text(tx, top + 30, fmt(d.value), { size: 30, weight: 800, fill: t.text, anchor }))
      lines.forEach((line, j) =>
        out.push(text(tx, top + 62 + j * 28, line, { size: 22, fill: t.muted, anchor }))
      )
    })
    callout(out, spec, t, b.x + pad.l, b.y + 100, 380)
  },

  column(out, spec, t, b, fmt) {
    const pts = spec.data
    const hl = spec.highlight ?? pts[pts.length - 1].label
    const max = Math.max(...pts.map((d) => d.value)) * 1.12
    const top = b.y + (spec.callout ? 190 : 20)
    const base = b.y + b.h - 60
    const slot = b.w / pts.length
    const bw = Math.min(140, slot * 0.64)
    pts.forEach((d, i) => {
      const on = d.label === hl
      const h = (Math.max(0, d.value) / max) * (base - top)
      const x = b.x + i * slot + (slot - bw) / 2
      out.push(
        `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="6" fill="${on ? t.accent : t.base}"/>`
      )
      out.push(
        text(x + bw / 2, base - h - 16, fmt(d.value), {
          size: 28,
          weight: 800,
          fill: on ? t.accent : t.text,
          anchor: 'middle'
        })
      )
      out.push(text(x + bw / 2, base + 40, d.label, { size: 24, fill: t.muted, anchor: 'middle' }))
    })
    out.push(`<rect x="${b.x}" y="${base}" width="${b.w}" height="2" fill="${t.faint}"/>`)
    callout(out, spec, t, b.x, b.y + 100, 420)
  },

  'multi-line'(out, spec, t, b, fmt) {
    const labels = [...new Set(spec.data.map((d) => d.label))]
    const groups = [...new Set(spec.data.map((d) => d.group))]
    const max = Math.max(...spec.data.map((d) => d.value)) * 1.12
    const pad = { l: 90, r: 230, t: 40, b: 60 }
    const px = (i) => b.x + pad.l + (i * (b.w - pad.l - pad.r)) / Math.max(1, labels.length - 1)
    const py = (v) => b.y + b.h - pad.b - (v / max) * (b.h - pad.t - pad.b)
    const tk = ticks(max)
    const td = tk.some((v) => !Number.isInteger(v)) ? 1 : 0
    for (const v of tk) {
      out.push(
        `<rect x="${b.x + pad.l}" y="${py(v)}" width="${b.w - pad.l - pad.r}" height="1.5" fill="${t.faint}"/>`
      )
      out.push(
        text(b.x + pad.l - 14, py(v) + 8, fmt(v, td), { size: 22, fill: t.muted, anchor: 'end' })
      )
    }

    labels.forEach((l, i) =>
      out.push(
        text(px(i), b.y + b.h - pad.b + 40, l, { size: 24, fill: t.muted, anchor: 'middle' })
      )
    )
    const color = (g, i) =>
      g === spec.highlight ? t.accent : t.palette[(i + 1) % t.palette.length]
    const ends = []
    groups.forEach((g, gi) => {
      const pts = labels
        .map((l, i) => [i, spec.data.find((d) => d.group === g && d.label === l)])
        .filter(([, d]) => d)
      const path = pts.map(([i, d], k) => `${k ? 'L' : 'M'}${px(i)},${py(d.value)}`).join('')
      const on = g === spec.highlight
      out.push(
        `<path d="${path}" fill="none" stroke="${color(g, gi)}" stroke-width="${on ? 8 : 5}" stroke-linejoin="round" stroke-linecap="round"/>`
      )
      const [li, last] = pts[pts.length - 1]
      out.push(`<circle cx="${px(li)}" cy="${py(last.value)}" r="8" fill="${color(g, gi)}"/>`)
      ends.push({ y: py(last.value), x: px(li), g, v: last.value, c: color(g, gi) })
    })
    dodge(ends, 56, b.y, b.y + b.h - pad.b)
    for (const e of ends) {
      out.push(text(e.x + 20, e.y + 2, e.g, { size: 24, weight: 800, fill: e.c }))
      out.push(text(e.x + 20, e.y + 28, fmt(e.v), { size: 22, fill: t.muted }))
    }
  },

  donut(out, spec, t, b, fmt) {
    const items = [...spec.data].sort((a, c) => c.value - a.value)
    const color = colors(items, spec, t)
    const total = items.reduce((s, d) => s + d.value, 0)
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    const R = Math.min(b.w / 2 - 200, b.h / 2 - 40)
    const r = R * 0.6
    let a = 0
    const labels = []
    for (const d of items) {
      const sweep = (d.value / total) * 360
      out.push(
        `<path d="${arc(cx, cy, R, r, a, a + sweep)}" fill="${color(d)}" stroke="${t.bg}" stroke-width="4"/>`
      )
      const mid = a + sweep / 2
      const [lx, ly] = polar(cx, cy, R + 46, mid)
      labels.push({ d, mid, x: lx, y: ly, right: mid < 180 })
      a += sweep
    }

    for (const side of [true, false]) {
      const group = labels.filter((l) => l.right === side)
      dodge(group, 74, b.y + 20, b.y + b.h - 20)
      for (const l of group) {
        const [ex, ey] = polar(cx, cy, R + 8, l.mid)
        const tx = side ? Math.max(l.x, cx + 40) : Math.min(l.x, cx - 40)
        out.push(
          `<path d="M${ex},${ey}L${tx},${l.y - 8}" stroke="${t.muted}" stroke-width="1.5" fill="none"/>`
        )
        const anchor = side ? 'start' : 'end'
        const ox = side ? tx + 8 : tx - 8
        out.push(text(ox, l.y - 2, l.d.label, { size: 26, weight: 800, fill: t.text, anchor }))
        const share = Math.round((l.d.value / total) * 100) + '%'
        const detail = spec.suffix === '%' ? share : `${share} · ${fmt(l.d.value)}`
        out.push(text(ox, l.y + 26, detail, { size: 22, fill: t.muted, anchor }))
      }
    }

    const focus = items.find((d) => d.label === spec.highlight) ?? items[0]
    const share = Math.round((focus.value / total) * 100) + '%'
    out.push(
      text(cx, cy + 10, share, {
        size: r * 0.55,
        weight: 800,
        fill: color(focus),
        anchor: 'middle',
        spacing: -2
      })
    )
    wrap(focus.label, r * 1.5, 24)
      .slice(0, 2)
      .forEach((line, i) =>
        out.push(
          text(cx, cy + 10 + r * 0.25 + i * 30, line, { size: 24, fill: t.text, anchor: 'middle' })
        )
      )
  },

  waffle(out, spec, t, b, fmt) {
    const items = [...spec.data].sort((a, c) => c.value - a.value)
    const focus = items.find((d) => d.label === spec.highlight) ?? items[0]
    const ordered = [focus, ...items.filter((d) => d !== focus)]
    const total = items.reduce((s, d) => s + d.value, 0)
    const cells = largestRemainder(ordered.map((d) => (d.value / total) * 100))
    const fill = (d, i) =>
      d === focus ? t.accent : items.length === 2 ? t.base : t.palette[(i + 1) % t.palette.length]
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
        text(x, y + 56, cells[i] + '%', { size: 64, weight: 800, fill: fill(d, i), spacing: -2 })
      )
      out.push(text(x + 170, y + 34, d.label, { size: 26, weight: 800, fill: t.text }))
      if (spec.suffix !== '%') {
        out.push(text(x + 170, y + 64, fmt(d.value), { size: 22, fill: t.muted }))
      }
    })
  },

  stacked(out, spec, t, b, fmt) {
    const rows = [...new Set(spec.data.map((d) => d.label))]
    const parts = [...new Set(spec.data.map((d) => d.group))]
    const color = (p, i) =>
      p === spec.highlight ? t.accent : t.palette[(i + 1) % t.palette.length]
    let x = b.x
    parts.forEach((p, i) => {
      out.push(`<rect x="${x}" y="${b.y}" width="22" height="22" rx="4" fill="${color(p, i)}"/>`)
      out.push(text(x + 32, b.y + 19, p, { size: 24, fill: t.text }))
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
        (p) => spec.data.find((d) => d.label === r && d.group === p)?.value ?? 0
      )
      const sum = cells.reduce((s, v) => s + v, 0) || 1
      out.push(text(b.x, cy + 10, r, { size: 28, weight: 700, fill: t.text }))
      let cx = x0
      cells.forEach((v, pi) => {
        const w = (v / sum) * span
        if (w <= 0) {
          return
        }
        out.push(
          `<rect x="${cx + 1.5}" y="${cy - rowH * 0.34}" width="${Math.max(0, w - 3)}" height="${rowH * 0.68}" rx="4" fill="${color(parts[pi], pi)}"/>`
        )
        if (w > 70) {
          out.push(
            text(cx + w / 2, cy + 9, Math.round((v / sum) * 100) + '%', {
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
  },

  slope(out, spec, t, b, fmt) {
    const items = spec.data.filter((d) => d.previous !== undefined)
    const all = items.flatMap((d) => [d.value, d.previous])
    const lo = Math.min(0, ...all)
    const hi = Math.max(...all) * 1.05
    const lx = b.x + 300
    const rx = b.x + b.w - 300
    const top = b.y + 90
    const bottom = b.y + b.h - 30
    const py = (v) => bottom - ((v - lo) / (hi - lo)) * (bottom - top)
    out.push(
      text(lx, b.y + 30, spec.from ?? 'Before', {
        size: 28,
        weight: 800,
        fill: t.muted,
        anchor: 'middle'
      })
    )
    out.push(
      text(rx, b.y + 30, spec.to ?? 'After', {
        size: 28,
        weight: 800,
        fill: t.muted,
        anchor: 'middle'
      })
    )
    out.push(
      `<rect x="${lx - 1}" y="${top - 20}" width="2" height="${bottom - top + 20}" fill="${t.faint}"/>`
    )
    out.push(
      `<rect x="${rx - 1}" y="${top - 20}" width="2" height="${bottom - top + 20}" fill="${t.faint}"/>`
    )
    const color = (d) =>
      d.label === spec.highlight ? t.accent : d.value >= d.previous ? t.palette[2] : t.palette[4]
    const left = items.map((d) => ({ d, y: py(d.previous) }))
    const right = items.map((d) => ({ d, y: py(d.value) }))
    for (const d of items) {
      const on = d.label === spec.highlight
      out.push(
        `<path d="M${lx},${py(d.previous)}L${rx},${py(d.value)}" stroke="${color(d)}" stroke-width="${on ? 8 : 5}" fill="none" opacity="${spec.highlight && !on ? 0.55 : 1}"/>`
      )
      out.push(`<circle cx="${lx}" cy="${py(d.previous)}" r="8" fill="${color(d)}"/>`)
      out.push(`<circle cx="${rx}" cy="${py(d.value)}" r="8" fill="${color(d)}"/>`)
    }

    dodge(left, 40, top - 10, bottom + 10)
    dodge(right, 40, top - 10, bottom + 10)
    for (const l of left) {
      out.push(
        text(lx - 20, l.y + 9, `${l.d.label}  ${fmt(l.d.previous)}`, {
          size: 24,
          weight: 700,
          fill: t.text,
          anchor: 'end'
        })
      )
    }

    for (const r of right) {
      out.push(
        text(rx + 20, r.y + 9, `${fmt(r.d.value)}  ${r.d.label}`, {
          size: 24,
          weight: 700,
          fill: color(r.d)
        })
      )
    }
  },

  radial(out, spec, t, b, fmt) {
    const rows = [...spec.data].sort((a, c) => c.value - a.value)
    const max = rows[0].value
    const R = Math.min(b.w / 2, b.h / 2) - 10
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    const band = (R * 0.78) / rows.length
    rows.forEach((d, i) => {
      const r = R - i * band - band / 2
      const on = d.label === (spec.highlight ?? rows[0].label)
      const c = on ? t.accent : t.palette[(i + 1) % t.palette.length]
      const sw = band * 0.7
      out.push(
        `<path d="${stroke(cx, cy, r, 0, 270)}" stroke="${t.faint}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`
      )
      out.push(
        `<path d="${stroke(cx, cy, r, 0, Math.max(2, (d.value / max) * 270))}" stroke="${c}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`
      )
      const size = Math.min(26, band * 0.42)
      out.push(
        text(cx - 18, cy - r + size * 0.36, `${d.label}  ${fmt(d.value)}`, {
          size,
          weight: on ? 800 : 600,
          fill: on ? t.accent : t.text,
          anchor: 'end'
        })
      )
    })
  },

  choropleth(out, spec, t, b, fmt) {
    const shade = ramp(spec.data, t)
    const y = world(out, spec, t, b, (r, d) => (d ? shade(d.value) : t.faint))
    const top = [...spec.data].sort((a, c) => c.value - a.value)
    const labelled = top.slice(0, 5).concat(top.filter((d) => d.label === spec.highlight))
    mapLabels(out, spec, t, b, labelled, fmt)
    legend(out, spec, t, b.x, y + 28, shade, fmt)
    placeList(out, spec, t, { x: b.x, y: y + 110, w: b.w, h: b.y + b.h - y - 110 }, top, shade, fmt)
  },

  'bubble-map'(out, spec, t, b, fmt) {
    const shade = ramp(spec.data, t)
    const y = world(out, spec, t, b, () => t.faint)
    const k = b.w / MAPS.world.width
    const top = [...spec.data].sort((a, c) => c.value - a.value)
    const max = top[0].value
    for (const d of top) {
      const r = MAPS.world.regions.find((x) => x.name === d.label)
      if (!r) {
        continue
      }
      const radius = Math.max(5, Math.sqrt(d.value / max) * 64)
      const on = d.label === spec.highlight
      out.push(
        `<circle cx="${b.x + r.cx * k}" cy="${b.y + r.cy * k}" r="${radius}" fill="${on ? t.accent : t.palette[2]}" fill-opacity="0.82" stroke="${t.bg}" stroke-width="2"/>`
      )
    }

    mapLabels(
      out,
      spec,
      t,
      b,
      top.slice(0, 5).concat(top.filter((d) => d.label === spec.highlight)),
      fmt
    )
    placeList(
      out,
      spec,
      t,
      { x: b.x, y: y + 40, w: b.w, h: b.y + b.h - y - 40 },
      top,
      (v, d) => (d?.label === spec.highlight ? t.accent : t.palette[2]),
      fmt
    )
  },

  tiles(out, spec, t, b, fmt) {
    const shade = ramp(spec.data, t)
    const regions = MAPS[spec.map].regions
    const cols = Math.max(...regions.map((r) => r.col)) + 1
    const rows = Math.max(...regions.map((r) => r.row)) + 1
    const side = Math.min(b.h / rows, (b.w * 0.62) / cols)
    const gap = side * 0.06
    const byCode = new Map(spec.data.map((d) => [d.region, d]))
    for (const r of regions) {
      const d = byCode.get(r.code)
      const x = b.x + r.col * side
      const y = b.y + r.row * side
      const fill = d ? shade(d.value) : t.faint
      const on = d && d.label === spec.highlight
      out.push(
        `<rect x="${x + gap / 2}" y="${y + gap / 2}" width="${side - gap}" height="${side - gap}" rx="${side * 0.1}" fill="${fill}"${on ? ` stroke="${t.text}" stroke-width="5"` : ''}/>`
      )
      const ink = d ? contrast(fill, t) : t.muted
      out.push(
        text(x + side / 2, y + side * (d ? 0.45 : 0.58), r.code, {
          size: side * 0.3,
          weight: 800,
          fill: ink,
          anchor: 'middle'
        })
      )
      if (d) {
        out.push(
          text(x + side / 2, y + side * 0.76, fmt(d.value, Math.min(spec.decimals, 1)), {
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
    legend(out, spec, t, rx, b.y + 10, shade, fmt, rw)
    const top = [...spec.data].sort((a, c) => c.value - a.value).slice(0, spec.callout ? 5 : 8)
    top.forEach((d, i) => {
      const y = b.y + 150 + i * 62
      const on = d.label === spec.highlight
      out.push(
        text(rx, y, `${i + 1}. ${d.region ?? d.label}`, {
          size: 26,
          weight: 800,
          fill: on ? t.accent : t.text
        })
      )
      out.push(
        text(rx + rw, y, fmt(d.value), {
          size: 26,
          weight: 700,
          fill: on ? t.accent : t.text,
          anchor: 'end'
        })
      )
      out.push(text(rx, y + 26, d.label, { size: 18, fill: t.muted }))
    })
    callout(out, spec, t, rx, b.y + b.h - 150, rw)
  }
}

// Draws every country and returns where the map ends.
function world(out, spec, t, b, fill) {
  const m = MAPS.world
  const k = b.w / m.width
  const byName = new Map(spec.data.map((d) => [d.label, d]))
  const shapes = m.regions.map((r) => {
    const d = byName.get(r.name)
    const on = d && d.label === spec.highlight
    return `<path d="${r.d}" fill="${fill(r, d)}" stroke="${on ? t.text : t.bg}" stroke-width="${(on ? 2.5 : 0.6) / k}"/>`
  })
  // The highlight is drawn last so its outline is not covered by a neighbour.
  shapes.sort((a, c) => a.includes(`stroke="${t.text}"`) - c.includes(`stroke="${t.text}"`))
  out.push(`<g transform="translate(${b.x},${b.y}) scale(${k})">${shapes.join('')}</g>`)

  return b.y + m.height * k
}

// Values on the map for the largest few, skipping any that would land on a label already placed.
function mapLabels(out, spec, t, b, items, fmt) {
  const k = b.w / MAPS.world.width
  const placed = []
  for (const d of new Set(items)) {
    const r = MAPS.world.regions.find((x) => x.name === d.label)
    if (!r) {
      continue
    }
    const x = b.x + r.cx * k
    const y = b.y + r.cy * k
    if (placed.some((p) => Math.abs(p.x - x) < 90 && Math.abs(p.y - y) < 30)) {
      continue
    }
    placed.push({ x, y })
    const on = d.label === spec.highlight
    out.push(
      halo(
        x,
        y + 8,
        fmt(d.value),
        { size: on ? 28 : 24, weight: 800, fill: t.text, anchor: 'middle' },
        t
      )
    )
  }
}

function legend(out, spec, t, x, y, shade, fmt, w = 360) {
  const [lo, hi] = shade.domain
  const id = `ramp${spec.map}`
  out.push(
    `<defs><linearGradient id="${id}"><stop offset="0" stop-color="${shade(lo)}"/><stop offset="1" stop-color="${shade(hi)}"/></linearGradient></defs>`
  )
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="18" rx="9" fill="url(#${id})"/>`)
  out.push(text(x, y + 50, fmt(lo), { size: 22, weight: 700, fill: t.muted }))
  out.push(text(x + w, y + 50, fmt(hi), { size: 22, weight: 700, fill: t.muted, anchor: 'end' }))
  if (spec.data.length < MAPS[spec.map].regions.length) {
    const [nx, ny] = x + w + 200 < W ? [x + w + 40, y] : [x, y + 78]
    out.push(`<rect x="${nx}" y="${ny}" width="18" height="18" rx="4" fill="${t.faint}"/>`)
    out.push(text(nx + 28, ny + 16, 'No data', { size: 22, fill: t.muted }))
  }
}

// Every value, in columns, so a country too small to see on the map is still read.
function placeList(out, spec, t, b, items, shade, fmt) {
  const cols = items.length <= 8 ? 2 : 3
  const rows = Math.ceil(items.length / cols)
  const rowH = Math.min(52, b.h / rows)
  const size = Math.min(26, rowH * 0.56)
  const cw = b.w / cols
  items.forEach((d, i) => {
    const x = b.x + Math.floor(i / rows) * cw
    const y = b.y + (i % rows) * rowH + rowH / 2
    const on = d.label === spec.highlight
    out.push(
      `<rect x="${x}" y="${y - size * 0.45}" width="${size * 0.9}" height="${size * 0.9}" rx="4" fill="${shade(d.value, d)}"/>`
    )
    const room = Math.floor(
      (cw - 28 - size * 1.4 - (fmt(d.value).length + 1) * size * 0.6) / (size * 0.56)
    )
    const label = d.label.length > room ? d.label.slice(0, room - 1).trimEnd() + '…' : d.label
    out.push(
      text(x + size * 1.4, y + size * 0.36, label, {
        size,
        weight: on ? 800 : 500,
        fill: on ? t.accent : t.text
      })
    )
    out.push(
      text(x + cw - 28, y + size * 0.36, fmt(d.value), {
        size,
        weight: 800,
        fill: on ? t.accent : t.text,
        anchor: 'end'
      })
    )
  })
}

// One hue from faint to the accent: a map reads intensity, not categories.
function ramp(data, t) {
  const values = data.map((d) => d.value)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const shade = (v) => mix(t.bg, t.accent, 0.28 + 0.72 * (hi === lo ? 1 : (v - lo) / (hi - lo)))
  shade.domain = [lo, hi]
  return shade
}

function mix(a, c, f) {
  const [x, y] = [a, c].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)))
  return (
    '#' +
    x
      .map((v, i) =>
        Math.round(v + (y[i] - v) * f)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  )
}

const luma = (hex) =>
  [1, 3, 5].reduce((s, i, k) => s + parseInt(hex.slice(i, i + 2), 16) * [0.299, 0.587, 0.114][k], 0)

function contrast(fill, t) {
  if (luma(fill) < 150) return '#ffffff'
  return luma(t.bg) < luma(t.text) ? t.bg : t.text
}

function halo(x, y, str, opts, t) {
  return text(x, y, str, opts).replace(
    '<text ',
    `<text stroke="${t.bg}" stroke-width="6" stroke-linejoin="round" paint-order="stroke" `
  )
}

// Angles run clockwise from twelve o'clock.
function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)]
}

function arc(cx, cy, R, r, a0, a1) {
  const end = Math.min(a1, a0 + 359.99)
  const large = end - a0 > 180 ? 1 : 0
  const [x0, y0] = polar(cx, cy, R, a0)
  const [x1, y1] = polar(cx, cy, R, end)
  const [x2, y2] = polar(cx, cy, r, end)
  const [x3, y3] = polar(cx, cy, r, a0)
  return `M${x0},${y0}A${R},${R} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${r},${r} 0 ${large} 0 ${x3},${y3}Z`
}

function stroke(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0)
  const [x1, y1] = polar(cx, cy, r, a1)
  return `M${x0},${y0}A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1}`
}

// Pushes labels apart to at least `gap`, keeping them inside [lo, hi].
function dodge(items, gap, lo, hi) {
  items.sort((a, b) => a.y - b.y)
  for (let i = 1; i < items.length; i++) {
    items[i].y = Math.max(items[i].y, items[i - 1].y + gap)
  }
  const over = items.length ? items[items.length - 1].y - hi : 0
  if (over > 0) {
    for (const it of items) {
      it.y -= over
    }
  }
  for (let i = items.length - 2; i >= 0; i--) {
    items[i].y = Math.min(items[i].y, items[i + 1].y - gap)
  }

  if (items.length && items[0].y < lo) {
    const shift = lo - items[0].y
    for (const it of items) {
      it.y += shift
    }
  }
}

function largestRemainder(shares) {
  const floors = shares.map(Math.floor)
  let left = 100 - floors.reduce((s, v) => s + v, 0)
  const order = shares.map((s, i) => [s - floors[i], i]).sort((a, b) => b[0] - a[0])
  for (const [, i] of order) {
    if (left-- > 0) {
      floors[i]++
    }
  }
  return floors
}

function colors(items, spec, t) {
  const groups = [...new Set(items.map((d) => d.group).filter(Boolean))]
  return (d) => {
    if (d.label && d.label === spec.highlight) return t.accent
    if (d.group && groups.length > 1) {
      return t.palette[(groups.indexOf(d.group) + 1) % t.palette.length]
    }

    return t.palette[(items.indexOf(d) + 1) % t.palette.length]
  }
}

// Front-chain-free packing: each circle goes to the tangent spot nearest the origin.
function pack(radii, gap) {
  const g = gap * radii[0]
  const placed = []
  for (const r of radii) {
    if (!placed.length) {
      placed.push({ x: 0, y: 0, r })
      continue
    }

    const cand = []
    for (const a of placed) {
      for (let s = 0; s < 24; s++) {
        const ang = (s / 24) * 2 * Math.PI
        cand.push({
          x: a.x + (a.r + r + g) * Math.cos(ang),
          y: a.y + (a.r + r + g) * Math.sin(ang)
        })
      }

      for (const c of placed) {
        if (c === a) continue
        cand.push(...tangent(a, c, r + g))
      }
    }

    let best = null
    for (const p of cand) {
      if (placed.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < c.r + r + g - 1e-6)) {
        continue
      }
      const d = Math.hypot(p.x, p.y * 1.25)
      if (!best || d < best.d) {
        best = { ...p, d }
      }
    }

    placed.push({ x: best.x, y: best.y, r })
  }

  return placed
}

function tangent(a, b, r) {
  const da = a.r + r
  const db = b.r + r
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.hypot(dx, dy)
  if (d > da + db || d < Math.abs(da - db) || d === 0) {
    return []
  }
  const l = (da * da - db * db + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, da * da - l * l))
  const mx = a.x + (l * dx) / d
  const my = a.y + (l * dy) / d
  return [
    { x: mx + (h * dy) / d, y: my - (h * dx) / d },
    { x: mx - (h * dy) / d, y: my + (h * dx) / d }
  ]
}

function bounds(cs) {
  return {
    x0: Math.min(...cs.map((c) => c.x - c.r)),
    x1: Math.max(...cs.map((c) => c.x + c.r)),
    y0: Math.min(...cs.map((c) => c.y - c.r)),
    y1: Math.max(...cs.map((c) => c.y + c.r))
  }
}

function squarify(values, rect) {
  const total = values.reduce((s, v) => s + v, 0)
  const areas = values.map((v) => (v / total) * rect.w * rect.h)
  const cells = []
  let r = { ...rect }
  let row = []
  const worst = (row, side) => {
    const s = row.reduce((a, b) => a + b, 0)
    return Math.max(
      ...row.map((a) => Math.max((side * side * a) / (s * s), (s * s) / (side * side * a)))
    )
  }
  const lay = (row) => {
    const s = row.reduce((a, b) => a + b, 0)
    if (r.w >= r.h) {
      const w = s / r.h
      let y = r.y
      for (const a of row) {
        ;(cells.push({ x: r.x, y, w, h: a / w }), (y += a / w))
      }
      r = { x: r.x + w, y: r.y, w: r.w - w, h: r.h }
    } else {
      const h = s / r.w
      let x = r.x
      for (const a of row) {
        ;(cells.push({ x, y: r.y, w: a / h, h }), (x += a / h))
      }
      r = { x: r.x, y: r.y + h, w: r.w, h: r.h - h }
    }
  }
  for (const a of areas) {
    const side = Math.min(r.w, r.h)
    if (!row.length || worst([...row, a], side) <= worst(row, side)) {
      row.push(a)
    } else {
      ;(lay(row), (row = [a]))
    }
  }

  if (row.length) {
    lay(row)
  }

  return cells
}

function ticks(max) {
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)))
  const unit = [1, 2, 2.5, 5, 10].map((m) => m * step).find((s) => max / s <= 5)
  const out = []
  for (let v = 0; v <= max; v += unit) {
    out.push(v)
  }
  return out
}

function wrap(str, width, size) {
  const per = Math.floor(width / (size * 0.54))
  const lines = []
  let line = ''
  for (const word of str.split(/\s+/)) {
    if (line && (line + ' ' + word).length > per) {
      ;(lines.push(line), (line = word))
    } else {
      line = line ? line + ' ' + word : word
    }
  }

  if (line) {
    lines.push(line)
  }

  return lines
}

function text(x, y, str, { size, weight = 400, fill, anchor = 'start', spacing = 0 }) {
  const esc = String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}">${esc}</text>`
}
