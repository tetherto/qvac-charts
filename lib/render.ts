import { charts } from './charts/index.ts'
import { formatter } from './format.ts'
import { frame, svg, type Mark } from './frame.ts'
import type { Chart } from './spec.ts'
import { fixed } from './svg.ts'
import { themes, type ThemeName } from './themes.ts'

export interface RenderOptions {
  theme: ThemeName
  mark?: Mark | undefined
}

export function render(chart: Chart, { theme, mark }: RenderOptions): string {
  const t = themes[theme]
  const { out: head, box } = frame(chart, { t, mark })
  const out: string[] = []

  charts[chart.type]({ out, spec: chart, t, b: box, fmt: formatter(chart) })

  return fixed(svg(t, [...head, ...out]))
}
