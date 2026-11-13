// Regenerates lib/maps/world.js: npm run build:world
import { readFileSync, writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import { geoNaturalEarth1, geoPath, geoCentroid, geoArea } from 'd3-geo'

const topo = JSON.parse(readFileSync('node_modules/world-atlas/countries-110m.json', 'utf8'))
const rename = {
  'United States of America': 'United States',
  'Dem. Rep. Congo': 'DR Congo',
  'Dominican Rep.': 'Dominican Republic',
  'Central African Rep.': 'Central African Republic',
  'Eq. Guinea': 'Equatorial Guinea',
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Solomon Is.': 'Solomon Islands',
  'Falkland Is.': 'Falkland Islands',
  'W. Sahara': 'Western Sahara',
  'S. Sudan': 'South Sudan',
  eSwatini: 'Eswatini',
  Macedonia: 'North Macedonia',
  'N. Cyprus': 'Northern Cyprus'
}
const drop = new Set(['Antarctica', 'Fr. S. Antarctic Lands'])
const fc = feature(topo, topo.objects.countries)
fc.features = fc.features.filter((f) => !drop.has(f.properties.name))
const width = 936
const projection = geoNaturalEarth1().fitWidth(width, fc)
const path = geoPath(projection).digits(1)
const [[, y0], [, y1]] = path.bounds(fc)
const height = Math.ceil(y1 - y0)
projection.translate([projection.translate()[0], projection.translate()[1] - y0])

// Centroid of the largest polygon, so France's label sits in France, not between it and Guiana.
function anchor(f) {
  if (f.geometry.type !== 'MultiPolygon') {
    return projection(geoCentroid(f))
  }

  const polys = f.geometry.coordinates.map((c) => ({ type: 'Polygon', coordinates: c }))
  const big = polys.reduce((a, b) => (geoArea(a) > geoArea(b) ? a : b))

  return projection(geoCentroid(big))
}

const regions = fc.features.map((f) => {
  const name = rename[f.properties.name] ?? f.properties.name
  const [cx, cy] = anchor(f).map((v) => Math.round(v))
  return { name, d: path(f), cx, cy }
})
const src = `// Generated from world-atlas countries-110m (Natural Earth, public domain), Natural Earth projection.
export const world = ${JSON.stringify({ width, height, regions })}
`
writeFileSync(process.argv[2], src)
console.log(regions.length, height, src.length)
