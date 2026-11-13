import test from 'brittle'
import { Chart } from '../index.ts'

test('the schema is the spec the model fills', (t) => {
  t.is(Chart.schema.type, 'object')
  t.ok(Chart.schema.required.includes('shape'))
})

test('a chart is picked from the shape of its data', (t) => {
  const chart = Chart.from({
    shape: 'parts',
    title: 'Where the sprint went',
    subtitle: 'Share of hours',
    data: [
      { label: 'Features', value: 45 },
      { label: 'Bugs', value: 25 },
      { label: 'Meetings', value: 20 },
      { label: 'Review', value: 10 }
    ],
    highlight: 'Features',
    scale: 'ones',
    unit: 'percent',
    callout: 'share',
    source: 'User data'
  })
  t.is(chart.type, 'donut')
  t.ok(chart.toSVG().startsWith('<svg '))
})
