import type { Draw } from '../frame.ts'
import type { ChartType } from '../spec.ts'
import { bubbleMap, choropleth, tiles } from './maps.ts'
import { bubbles, donut, stacked, treemap, waffle } from './parts.ts'
import { radial, rankedBar } from './ranking.ts'
import { slope } from './slope.ts'
import { column, line, multiLine } from './time.ts'

export const charts: Readonly<Record<ChartType, (d: Draw) => void>> = {
  'ranked-bar': rankedBar,
  radial,
  bubbles,
  treemap,
  donut,
  waffle,
  stacked,
  line,
  column,
  'multi-line': multiLine,
  slope,
  choropleth,
  'bubble-map': bubbleMap,
  tiles
}
