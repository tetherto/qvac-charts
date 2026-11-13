export interface Point {
  x: number
  y: number
}

export interface Circle extends Point {
  r: number
}

export interface Rect extends Point {
  w: number
  h: number
}

export interface Polar {
  r: number
  deg: number
}

// Angles run clockwise from twelve o'clock.
export function polar(c: Point, { r, deg }: Polar): [number, number] {
  const a = (deg * Math.PI) / 180

  return [c.x + r * Math.sin(a), c.y - r * Math.cos(a)]
}

export interface Ring {
  outer: number
  inner: number
  from: number
  to: number
}

export function arc(c: Point, { outer: R, inner: r, from: a0, to: a1 }: Ring): string {
  const end = Math.min(a1, a0 + 359.99)
  const large = end - a0 > 180 ? 1 : 0
  const [x0, y0] = polar(c, { r: R, deg: a0 })
  const [x1, y1] = polar(c, { r: R, deg: end })
  const [x2, y2] = polar(c, { r, deg: end })
  const [x3, y3] = polar(c, { r, deg: a0 })

  return `M${x0},${y0}A${R},${R} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${r},${r} 0 ${large} 0 ${x3},${y3}Z`
}

export interface Sweep {
  r: number
  from: number
  to: number
}

export function stroke(c: Point, { r, from: a0, to: a1 }: Sweep): string {
  const [x0, y0] = polar(c, { r, deg: a0 })
  const [x1, y1] = polar(c, { r, deg: a1 })

  return `M${x0},${y0}A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1}`
}

export interface Span {
  gap: number
  lo: number
  hi: number
}

// Pushes labels apart to at least `gap`, keeping them inside [lo, hi].
export interface Placed {
  y: number
}

export function dodge(items: Placed[], { gap, lo, hi }: Span): void {
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

// Whole percentages that still sum to 100: the largest remainders round up.
export function largestRemainder(shares: ReadonlyArray<number>): number[] {
  const floors = shares.map(Math.floor)
  const order = shares.map((s, i) => [s - floors[i], i]).sort((a, b) => b[0] - a[0])
  let left = 100 - floors.reduce((s, v) => s + v, 0)

  for (const [, i] of order) {
    if (left-- > 0) {
      floors[i]++
    }
  }

  return floors
}

// Front-chain-free packing: each circle goes to the tangent spot nearest the origin.
export function pack(radii: ReadonlyArray<number>, gap: number): Circle[] {
  const g = gap * radii[0]
  const placed: Circle[] = []

  for (const r of radii) {
    if (!placed.length) {
      placed.push({ x: 0, y: 0, r })
      continue
    }

    const free = candidates(placed, r + g).filter(
      (p) => !placed.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < c.r + r + g - 1e-6)
    )
    const reach = (p: Point): number => Math.hypot(p.x, p.y * 1.25)
    const best = free.reduce((a, p) => (reach(p) < reach(a) ? p : a))

    placed.push({ x: best.x, y: best.y, r })
  }

  return placed
}

function candidates(placed: ReadonlyArray<Circle>, r: number): Point[] {
  const cand: Point[] = []

  for (const a of placed) {
    for (let s = 0; s < 24; s++) {
      const ang = (s / 24) * 2 * Math.PI

      cand.push({ x: a.x + (a.r + r) * Math.cos(ang), y: a.y + (a.r + r) * Math.sin(ang) })
    }

    for (const c of placed) {
      if (c !== a) {
        cand.push(...tangent([a, c], r))
      }
    }
  }

  return cand
}

function tangent([a, b]: [Circle, Circle], r: number): Point[] {
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

export interface Bounds {
  x0: number
  x1: number
  y0: number
  y1: number
}

export function bounds(cs: ReadonlyArray<Circle>): Bounds {
  return {
    x0: Math.min(...cs.map((c) => c.x - c.r)),
    x1: Math.max(...cs.map((c) => c.x + c.r)),
    y0: Math.min(...cs.map((c) => c.y - c.r)),
    y1: Math.max(...cs.map((c) => c.y + c.r))
  }
}

export function squarify(values: ReadonlyArray<number>, rect: Rect): Rect[] {
  const total = values.reduce((s, v) => s + v, 0)
  const areas = values.map((v) => (v / total) * rect.w * rect.h)
  const cells: Rect[] = []
  let r: Rect = { ...rect }
  let row: number[] = []

  for (const a of areas) {
    const side = Math.min(r.w, r.h)

    if (!row.length || worst([...row, a], side) <= worst(row, side)) {
      row.push(a)
    } else {
      r = lay(row, { r, cells })
      row = [a]
    }
  }

  if (row.length) {
    lay(row, { r, cells })
  }

  return cells
}

function worst(row: ReadonlyArray<number>, side: number): number {
  const s = row.reduce((a, b) => a + b, 0)

  return Math.max(
    ...row.map((a) => Math.max((side * side * a) / (s * s), (s * s) / (side * side * a)))
  )
}

// Lays one row of the treemap along the shorter side and returns the rectangle left over.
interface Layout {
  r: Rect
  cells: Rect[]
}

function lay(row: ReadonlyArray<number>, { r, cells }: Layout): Rect {
  const s = row.reduce((a, b) => a + b, 0)

  if (r.w >= r.h) {
    const w = s / r.h
    let y = r.y

    for (const a of row) {
      cells.push({ x: r.x, y, w, h: a / w })
      y += a / w
    }

    return { x: r.x + w, y: r.y, w: r.w - w, h: r.h }
  }

  const h = s / r.w
  let x = r.x

  for (const a of row) {
    cells.push({ x, y: r.y, w: a / h, h })
    x += a / h
  }

  return { x: r.x, y: r.y + h, w: r.w, h: r.h - h }
}

export function ticks(max: number): number[] {
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)))
  const unit = [1, 2, 2.5, 5].map((m) => m * step).find((s) => max / s <= 5) ?? 10 * step
  const out: number[] = []

  for (let v = 0; v <= max; v += unit) {
    out.push(v)
  }

  return out
}
