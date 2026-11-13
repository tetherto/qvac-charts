import { formatter } from './lib/format.ts'
import { normalize } from './lib/normalize.ts'
import type { Mark } from './lib/frame.ts'
import { render } from './lib/render.ts'
import { chartSchema } from './lib/schema.ts'
import type { Chart as Normalized, ChartType, Spec } from './lib/spec.ts'
import type { Maps } from './lib/places.ts'
import type { ThemeName } from './lib/themes.ts'

export type { ChartType, Mark, Spec, ThemeName }

export interface ChartOptions {
  maps?: Maps
}

export interface SVGOptions {
  theme?: ThemeName
  // The host's brand mark, drawn at the right of the footer; nothing is drawn without it.
  mark?: Mark
}

export class Chart {
  static schema = chartSchema

  // Place charts need the map data from @qvac/charts/maps; without it they are drawn as rankings.
  static from(spec: Spec, { maps }: ChartOptions = {}): Chart {
    return new Chart(normalize(spec, maps))
  }

  readonly type: ChartType
  readonly summary: string
  private normalized: Normalized

  private constructor(normalized: Normalized) {
    this.normalized = normalized
    this.type = normalized.type
    this.summary = summarize(normalized)
  }

  toSVG({ theme = 'dark', mark }: SVGOptions = {}): string {
    return render(this.normalized, { theme, mark })
  }
}

// One line a model can talk about the chart from, without seeing it.
function summarize(chart: Normalized): string {
  const name = chart.type.replace('-', ' ')
  const kind = name[0].toUpperCase() + name.slice(1)
  const lead = chart.data.find((d) => d.label === chart.highlight)
  const focus = lead ? `, highlight ${lead.label}, ${formatter(chart)(lead.value)}` : ''

  return `${kind}, ${chart.data.length} items${focus}`
}
