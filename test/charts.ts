import test from 'brittle'
import { Chart, type Spec } from '../index.ts'

const base = { title: 'T', subtitle: 'S', scale: 'ones', unit: 'number', source: 'User data' }
const zeros = (n: number): Spec['data'] =>
  Array.from({ length: n }, (_, i) => ({ label: String(2020 + i), value: 0 }))

test('a series that is all zero still draws', (t) => {
  for (const [shape, n] of [
    ['over-time', 7],
    ['over-time', 3],
    ['ranking', 3]
  ] as const) {
    const svg = Chart.from({ ...base, shape, data: zeros(n), callout: 'none' }).toSVG()

    t.absent(svg.includes('NaN'), `${shape} with ${n} points`)
  }
})

test('a treemap with a single group draws no legend', (t) => {
  const spec: Spec = {
    ...base,
    shape: 'parts',
    variant: 'treemap',
    data: ['a', 'b', 'c', 'd', 'e', 'f'].map((label, i) => ({
      label,
      value: 10 - i,
      group: 'Only'
    })),
    callout: 'none'
  }

  t.absent(Chart.from(spec).toSVG().includes('>Only<'))
})

test('numbers written in a label are not rounded', (t) => {
  const spec: Spec = {
    ...base,
    shape: 'ranking',
    title: 'Error at tolerance="0.0125"',
    data: [
      { label: 'a', value: 2 },
      { label: 'b', value: 1 }
    ],
    callout: 'none'
  }

  t.ok(Chart.from(spec).toSVG().includes('tolerance="0.0125"'))
})
