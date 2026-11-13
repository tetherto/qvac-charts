import type { Maps } from './places.ts'

export type ChartType =
  | 'ranked-bar'
  | 'bubbles'
  | 'treemap'
  | 'line'
  | 'column'
  | 'multi-line'
  | 'donut'
  | 'waffle'
  | 'stacked'
  | 'slope'
  | 'radial'
  | 'choropleth'
  | 'bubble-map'
  | 'tiles'

export interface Item {
  label: string
  value: number
  group?: string | undefined
  previous?: number | undefined
  note?: string | undefined
}

export interface Annotation {
  label: string
  text: string
}

export interface Callout {
  value: string
  text: string
}

// What a model writes. Older hand-written specs name the chart and its units directly instead.
export interface Spec {
  shape?: string
  variant?: string
  type?: ChartType
  title: string
  subtitle: string
  data: ReadonlyArray<Item>
  highlight?: string | undefined
  scale?: string
  unit?: string
  prefix?: string
  suffix?: string
  decimals?: number
  annotations?: ReadonlyArray<Annotation>
  callout?: string | Callout
  source: string
  map?: string
  from?: string | undefined
  to?: string | undefined
}

export interface Row extends Item {
  region?: string | undefined
}

// A spec after normalization: base units rescaled, the chart picked, derived numbers computed.
export interface Chart {
  type: ChartType
  shape?: string | undefined
  title: string
  subtitle: string
  source: string
  data: ReadonlyArray<Row>
  highlight: string | undefined
  callout: Callout | undefined
  prefix: string | undefined
  suffix: string | undefined
  decimals: number
  map: string
  maps: Maps | undefined
  from: string | undefined
  to: string | undefined
  annotations: ReadonlyArray<Annotation>
}
