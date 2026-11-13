// A country on a map, its outline in the map's own pixels and the point its value is labelled at.
export interface GeoRegion {
  name: string
  d: string
  cx: number
  cy: number
}

export interface GeoMap {
  width: number
  height: number
  regions: ReadonlyArray<GeoRegion>
  // Other spellings of a country, keyed by the name the map draws it under.
  aliases: Readonly<Record<string, ReadonlyArray<string>>>
}

// The map data a host passes in to draw place charts; it ships as its own entry, qvac-charts/maps.
export interface Maps {
  world: GeoMap
  // A continent's countries, drawn closer; only the continents a host loaded.
  continents: Readonly<Record<string, GeoMap>>
}

export const WORLD = 'world'

// Matching ignores case and accents, so "Vietnã", "VIETNA" and "vietna" are one name.
export const key = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const indexed = new WeakMap<GeoMap, Map<string, GeoRegion>>()

// Every spelling a model may write, each pointing at the one country the map draws.
function names(map: GeoMap): Map<string, GeoRegion> {
  const known = indexed.get(map)

  if (known) {
    return known
  }

  const built = new Map<string, GeoRegion>()

  for (const r of map.regions) {
    for (const name of [r.name, ...(map.aliases[r.name] ?? [])]) {
      if (!built.has(key(name))) {
        built.set(key(name), r)
      }
    }
  }

  indexed.set(map, built)

  return built
}

export function geoMap(maps: Maps, map: string): GeoMap {
  return map === WORLD ? maps.world : maps.continents[map]
}

export interface Place {
  map: string
  label: string | undefined
}

export function lookup(maps: Maps, { map, label }: Place): GeoRegion | undefined {
  return names(geoMap(maps, map)).get(key(label ?? ''))
}

// The map that knows most of the labels; a continent that knows as many as the world is drawn closer.
export function mapFor(maps: Maps, labels: ReadonlyArray<string>): string {
  const hits = (map: string): number =>
    labels.filter((label) => lookup(maps, { map, label })).length
  let best = WORLD

  for (const map of Object.keys(maps.continents)) {
    if (hits(map) >= hits(best)) {
      best = map
    }
  }

  return best
}
