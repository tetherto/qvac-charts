import { charts } from './charts/index.ts'
import { formatter } from './format.ts'
import { frame, svg } from './frame.ts'
import type { Chart } from './spec.ts'
import { fixed } from './svg.ts'
import { themes, type ThemeName } from './themes.ts'

export function render(chart: Chart, theme: ThemeName): string {
  const t = themes[theme]
  const { out: head, box } = frame(chart, t)
  const out: string[] = []

  charts[chart.type]({ out, spec: chart, t, b: box, fmt: formatter(chart) })

  return fixed(svg(t, [...head, ...out]))
}
