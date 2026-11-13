import { canonical, mapFor, region, type MapName } from './maps/index.ts'
import { pick } from './pick.ts'
import type { Callout, Chart, ChartType, Row, Spec } from './spec.ts'

// The spec as it moves through normalization: rows may gain a region, a change gains its moments.
export interface Draft extends Omit<Spec, 'data'> {
  data: ReadonlyArray<Row>
}

const prefixes: Partial<Record<string, string>> = {
  dollars: '$',
  euros: '€',
  pounds: '£',
  reais: 'R$'
}
const scales: Partial<Record<string, number>> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }
const scaleWords: Partial<Record<string, string>> = {
  ones: '',
  thousands: 'K',
  millions: 'M',
  billions: 'B',
  trillions: 'T'
}

const PARTS: ReadonlyArray<ChartType> = [
  'donut',
  'waffle',
  'treemap',
  'bubbles',
  'stacked',
  'choropleth',
  'bubble-map',
  'tiles'
]

const PERIOD = /^(\d{4}|q[1-4]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i

// Derived numbers are computed here, never by the model: small models get the arithmetic wrong.
export function normalize(input: Spec): Chart {
  const spec = arranged(input)
  const notes = new Map((spec.annotations ?? []).map((a) => [a.label, a.text]))

  // Back to base units first, so "4800 thousands" is shown as 4.8M, not 4,800K.
  const raw = Math.max(...spec.data.map((d) => Math.abs(d.value)))
  const named =
    spec.unit === 'percent'
      ? 1
      : (scales[scaleWords[spec.scale ?? ''] ?? ''] ?? scales[spec.scale ?? ''] ?? 1)

  // Nobody writes "1,460,000,000 million": numbers that large are already in full.
  const given = raw >= 1e5 ? 1 : named
  const max = raw * given
  const rescale = max >= 1e4 ? ([1e12, 1e9, 1e6, 1e3].find((s) => max >= s) ?? 1) : 1
  const k = given / rescale
  const data: ReadonlyArray<Row> = spec.data.map((d) => ({
    ...d,
    value: d.value * k,
    previous: d.previous === undefined ? undefined : d.previous * k,
    note: notes.get(d.label) ?? d.note
  }))

  const names = new Set(data.flatMap((d) => [d.label, d.group]))
  const highlight = names.has(spec.highlight) ? spec.highlight : undefined
  const callout =
    typeof spec.callout === 'string' ? derive(spec.callout, { data, highlight }) : spec.callout
  const scaled =
    given !== 1 || rescale !== 1
      ? (Object.entries(scales).find(([, s]) => s === rescale)?.[0] ?? '')
      : undefined
  const scale = scaled ?? scaleWords[spec.scale ?? ''] ?? (spec.scale === 'none' ? '' : spec.scale)
  const prefix = spec.unit ? (prefixes[spec.unit] ?? '') : spec.prefix
  const suffix = spec.unit ? unitSuffix(spec.unit, scale) : (scaled ?? spec.suffix)
  const type = pick(spec, data)

  return {
    type,
    shape: spec.shape,
    title: spec.title,
    subtitle: spec.subtitle,
    source: spec.source,
    data,
    highlight,
    callout: spec.callout === 'share' && !PARTS.includes(type) ? undefined : callout,
    prefix,
    suffix,
    decimals: decimals(spec, { data, scaled }),
    map: spec.map ?? 'world',
    from: spec.from,
    to: spec.to,
    annotations: spec.annotations ?? []
  }
}

function arranged(input: Spec): Draft {
  let spec: Draft = unswap(input)

  if (spec.shape === 'places') {
    spec = places(spec)
  }

  if (spec.shape === 'change' && !spec.data.some((d) => d.previous !== undefined)) {
    spec = pairs(spec)
  }

  return spec
}

function unitSuffix(unit: string, scale: string | undefined): string {
  return unit === 'percent' ? '%' : (scale ?? '')
}

interface DecimalsContext {
  data: ReadonlyArray<Row>
  scaled: string | undefined
}

function decimals(spec: Draft, { data, scaled }: DecimalsContext): number {
  const top = Math.max(...data.map((d) => Math.abs(d.value)))

  if (scaled === undefined) {
    const fractional = data.some((d) => !Number.isInteger(d.value))

    return spec.decimals ?? (fractional && top < 1000 ? 1 : 0)
  }

  if (top < 10) {
    return 2
  }

  return top < 100 ? 1 : 0
}

// Periods filed as series and series as labels: two periods are a change, more are swapped back.
function unswap(spec: Spec): Draft {
  if (spec.shape !== 'over-time') return spec

  const groups = [...new Set(spec.data.map((d) => d.group).filter((g): g is string => Boolean(g)))]
  const swapped =
    groups.length >= 2 &&
    groups.every((g) => PERIOD.test(g)) &&
    !spec.data.some((d) => PERIOD.test(d.label))

  if (!swapped) {
    return spec
  }

  if (groups.length === 2) {
    return { ...spec, shape: 'change' }
  }

  return {
    ...spec,
    data: spec.data.map((d) => ({ ...d, label: d.group ?? d.label, group: d.label }))
  }
}

// Labels arrive as any name the model wrote ("USA", "Vietnã", "SP"); one region per canonical name.
function places(spec: Draft): Draft {
  const map = mapFor(spec.data.map((d) => d.label))
  const seen = new Set<string>()
  const data: Row[] = []

  for (const d of spec.data) {
    const label = canonical(map, d.label) ?? d.label

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
    highlight: canonical(map, spec.highlight) ?? spec.highlight,
    annotations: []
  }
}

// A change arrives as each item twice, grouped by moment; the slope wants one row per item.
function pairs(spec: Draft): Draft {
  const [from, to] = [...new Set(spec.data.map((d) => d.group))].sort()
  const at = (label: string, moment: string | undefined): number | undefined =>
    spec.data.find((d) => d.label === label && d.group === moment)?.value
  const data: Row[] = []

  for (const label of new Set(spec.data.map((d) => d.label))) {
    const previous = at(label, from)
    const value = at(label, to)

    if (previous === undefined || value === undefined) {
      continue
    }

    data.push({ label, previous, value })
  }

  return { ...spec, from, to, data }
}

interface DeriveContext {
  data: ReadonlyArray<Row>
  highlight: string | undefined
}

function derive(kind: string, { data, highlight }: DeriveContext): Callout | undefined {
  const sorted = [...data].sort((a, b) => b.value - a.value)

  if (kind === 'share') {
    const total = data.reduce((s, d) => s + d.value, 0)
    const d = data.find((x) => x.label === highlight) ?? sorted[0]

    return { value: Math.round((d.value / total) * 100) + '%', text: `of the total is ${d.label}` }
  }

  if (kind === 'growth') {
    return growth(data)
  }

  if (kind === 'ratio') {
    return ratio(sorted)
  }

  return undefined
}

function growth(data: ReadonlyArray<Row>): Callout {
  const [a, b] = [data[0], data[data.length - 1]]
  const x = b.value / a.value
  const value = x >= 10 ? x.toFixed(0) + '×' : (x >= 1 ? '+' : '') + Math.round((x - 1) * 100) + '%'

  return { value, text: `from ${a.label} to ${b.label}` }
}

function ratio(sorted: ReadonlyArray<Row>): Callout | undefined {
  const [a, b] = sorted

  if (a.value / b.value < 1.5) {
    return undefined
  }

  return {
    value: (a.value / b.value).toFixed(1) + '×',
    text: `${a.label} compared with ${b.label}`
  }
}
