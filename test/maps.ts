import test from 'brittle'
import { Chart, type Spec } from '../index.ts'
import { continents, maps, mapsFor } from '../maps.ts'

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

test('places on one continent load it and draw it closer', async (t) => {
  const labels = ['Alemanha', 'France', 'Malta']
  const loaded = await mapsFor(labels)
  const chart = Chart.from(
    { ...coffee, data: labels.map((label, i) => ({ label, value: i + 1 })), highlight: 'Malta' },
    { maps: loaded }
  )

  t.alike(Object.keys(loaded.continents), ['europe'])
  t.is(chart.summary, 'Choropleth, 3 items, highlight Malta, 3.00M')
  t.ok(chart.toSVG().includes('Germany'))
})

test('places on two continents stay on the world map', async (t) => {
  const chart = Chart.from(coffee, { maps: await mapsFor(['Brasil', 'Vietnã', 'Colômbia']) })

  t.is(chart.type, 'choropleth')
  t.ok(chart.toSVG().includes('Vietnam'))
})

test("a country's states are not on any map, so they are a ranking", async (t) => {
  const labels = ['São Paulo', 'Bahia']
  const chart = Chart.from(
    { ...coffee, data: labels.map((label, i) => ({ label, value: i + 1 })), highlight: 'Bahia' },
    { maps: await mapsFor(labels) }
  )

  t.is(chart.type, 'ranked-bar')
  t.alike(continents, ['africa', 'asia', 'europe', 'north-america', 'oceania', 'south-america'])
})

test('without the map data a place chart is a ranking of its places', (t) => {
  const chart = Chart.from(coffee)

  t.is(chart.type, 'ranked-bar')
  t.ok(chart.toSVG().includes('Vietnã'))
})
