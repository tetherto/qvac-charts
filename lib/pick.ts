import { isTiles } from './maps/index.ts'
import type { Draft } from './normalize.ts'
import type { ChartType, Row } from './spec.ts'

// The model names the shape of its data; the chart is chosen here, from the data itself.
export function pick(spec: Draft, data: ReadonlyArray<Row>): ChartType {
  if (spec.type) return spec.type

  const v = spec.variant
  const n = data.length

  if (spec.shape === 'places') {
    return placesChart(spec)
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
    return overTime(spec, data)
  }

  return parts(spec, data)
}

function hasSeries(data: ReadonlyArray<Row>): boolean {
  return (
    new Set(data.map((d) => d.group).filter(Boolean)).size > 1 &&
    new Set(data.map((d) => d.label)).size < data.length
  )
}

function placesChart(spec: Draft): ChartType {
  if (isTiles(spec.map ?? 'world')) return 'tiles'

  return spec.variant === 'bubbles' ? 'bubble-map' : 'choropleth'
}

function overTime(spec: Draft, data: ReadonlyArray<Row>): ChartType {
  if (hasSeries(data)) return 'multi-line'

  if (spec.variant === 'column' || spec.variant === 'line') return spec.variant

  return data.length <= 6 && !spec.annotations?.length ? 'column' : 'line'
}

function parts(spec: Draft, data: ReadonlyArray<Row>): ChartType {
  const v = spec.variant
  const n = data.length

  if (hasSeries(data)) {
    return 'stacked'
  }

  if (v === 'stacked') {
    return 'treemap'
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
