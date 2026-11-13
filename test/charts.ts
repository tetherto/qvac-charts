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

test('a host mark is drawn at the right of the footer, and only when passed', (t) => {
  const spec: Spec = {
    ...base,
    shape: 'ranking',
    data: [
      { label: 'a', value: 2 },
      { label: 'b', value: 1 }
    ],
    callout: 'none'
  }
  const mark = { href: 'data:image/png;base64,AAAA', width: 110, height: 48 }
  const chart = Chart.from(spec)

  t.ok(chart.toSVG({ mark }).includes('<image href="data:image/png;base64,AAAA" x="898" y="1260"'))
  t.absent(chart.toSVG().includes('<image'))
})

test('a mark href cannot break out of its attribute', (t) => {
  const spec: Spec = {
    ...base,
    shape: 'ranking',
    data: [
      { label: 'a', value: 2 },
      { label: 'b', value: 1 }
    ],
    callout: 'none'
  }
  const svg = Chart.from(spec).toSVG({
    mark: { href: 'x" onload="alert(1)', width: 10, height: 10 }
  })

  t.ok(svg.includes('href="x&quot; onload=&quot;alert(1)"'))
})

test('a mark href keeps its digits and a long one renders quickly', (t) => {
  const spec: Spec = {
    ...base,
    shape: 'ranking',
    data: [
      { label: 'a', value: 2 },
      { label: 'b', value: 1 }
    ],
    callout: 'none'
  }
  const chart = Chart.from(spec)
  const start = Date.now()
  const long = chart.toSVG({ mark: { href: '9'.repeat(200000), width: 10, height: 10 } })

  t.ok(Date.now() - start < 1000)
  t.ok(long.includes('9'.repeat(200000)))
  t.ok(
    chart
      .toSVG({ mark: { href: 'logo-1.23456.png', width: 10, height: 10 } })
      .includes('href="logo-1.23456.png"')
  )
})
