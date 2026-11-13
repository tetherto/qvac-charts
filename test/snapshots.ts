import test from 'brittle'
import { Chart } from '../index.ts'
import { maps } from '../maps.ts'
import { cases } from './fixtures/snapshots.ts'
import { fnv } from './helpers/fnv.ts'

for (const { name, spec, dark, light } of cases) {
  test(`${name} draws the same SVG as when it was reviewed`, (t) => {
    const chart = Chart.from(spec, { maps })
    t.is(fnv(chart.toSVG({ theme: 'dark' })), dark, 'dark')
    t.is(fnv(chart.toSVG({ theme: 'light' })), light, 'light')
  })
}
