import test from 'brittle'
import { Chart, type Spec } from '../index.ts'
import { maps } from '../maps.ts'

const base = { title: 'T', subtitle: 'S', scale: 'ones', unit: 'number', source: 'User data' }

test('a ratio needs a second item to compare against', (t) => {
  const spec: Spec = {
    ...base,
    shape: 'places',
    data: [
      { label: 'USA', value: 5 },
      { label: 'United States', value: 6 }
    ],
    highlight: 'USA',
    callout: 'ratio'
  }

  t.absent(Chart.from(spec, { maps }).toSVG().includes('compared with'))
})

test('growth from a first value of zero has no callout', (t) => {
  const spec: Spec = {
    ...base,
    shape: 'over-time',
    data: [
      { label: '2021', value: 0 },
      { label: '2022', value: 5 }
    ],
    highlight: '2022',
    callout: 'growth'
  }

  t.absent(Chart.from(spec).toSVG().includes('Infinity'))
})

test('a slope runs from the earlier moment to the later one', (t) => {
  const spec: Spec = {
    ...base,
    shape: 'change',
    data: [
      { label: 'Brazil', group: 'Q1 2025', value: 45 },
      { label: 'Brazil', group: 'Q4 2024', value: 32 },
      { label: 'Mexico', group: 'Q1 2025', value: 31 },
      { label: 'Mexico', group: 'Q4 2024', value: 28 }
    ],
    highlight: 'Brazil',
    callout: 'none'
  }
  const svg = Chart.from(spec).toSVG()

  t.ok(svg.indexOf('>Q4 2024<') < svg.indexOf('>Q1 2025<'), 'Q4 2024 is drawn first, on the left')
  t.ok(svg.includes('>Brazil  32<'), 'the left value is the earlier one')
})

test('moments that name no time keep the order they were written in', (t) => {
  const spec: Spec = {
    ...base,
    shape: 'change',
    data: [
      { label: 'Team', group: 'Before', value: 3 },
      { label: 'Team', group: 'After', value: 7 }
    ],
    callout: 'none'
  }
  const svg = Chart.from(spec).toSVG()

  t.ok(svg.indexOf('>Before<') < svg.indexOf('>After<'))
})

test('a named map type lands on the map its names belong to', (t) => {
  const spec: Spec = {
    ...base,
    type: 'tiles',
    data: [
      { label: 'Germany', value: 5 },
      { label: 'France', value: 6 }
    ],
    callout: 'none'
  }

  t.is(Chart.from(spec, { maps }).type, 'choropleth')
  t.is(Chart.from(spec).type, 'ranked-bar', 'and without maps it is a ranking')
})
