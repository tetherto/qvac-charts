import test from 'brittle'
import { Chart, type Spec } from '../index.ts'
import { maps } from '../maps.ts'

const coffee: Spec = {
  shape: 'places',
  title: 'Where coffee grows',
  subtitle: 'Millions of bags',
  data: [
    { label: 'Brasil', value: 66 },
    { label: 'Vietnã', value: 29 },
    { label: 'Colômbia', value: 12 }
  ],
  highlight: 'Brasil',
  scale: 'millions',
  unit: 'number',
  callout: 'none',
  source: 'User data'
}

test('place names in any spelling land on the world map', (t) => {
  const chart = Chart.from(coffee, { maps })

  t.is(chart.type, 'choropleth')
  t.is(chart.summary, 'Choropleth, 3 items, highlight Brazil, 66.0M')
})

test('state codes pick the Brazil grid', (t) => {
  const sales: Spec = {
    ...coffee,
    data: [
      { label: 'SP', value: 820 },
      { label: 'Rio de Janeiro', value: 410 }
    ],
    highlight: 'SP'
  }

  t.is(Chart.from(sales, { maps }).type, 'tiles')
})

test('without the map data a place chart is a ranking of its places', (t) => {
  const chart = Chart.from(coffee)

  t.is(chart.type, 'ranked-bar')
  t.ok(chart.toSVG().includes('Vietnã'))
})
