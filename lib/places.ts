export interface GeoRegion {
  name: string
  d: string
  cx: number
  cy: number
}

export interface Tile {
  code: string
  name: string
  col: number
  row: number
}

// The map data a host passes in to draw place charts; it ships as its own entry, charts/maps.
export interface Maps {
  world: {
    width: number
    height: number
    regions: ReadonlyArray<GeoRegion>
    aliases: Readonly<Record<string, ReadonlyArray<string>>>
  }
  tiles: Readonly<Record<string, ReadonlyArray<Tile>>>
}

// Matching ignores case and accents, so "sao paulo", "São Paulo" and "SAO PAULO" are one name.
const key = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Every spelling a model may write, each pointing at the one id the map draws.
interface Names {
  world: Map<string, string>
  tiles: Map<string, Map<string, string>>
}

const indexed = new WeakMap<Maps, Names>()

function names(maps: Maps): Names {
  const known = indexed.get(maps)

  if (known) {
    return known
  }

  const spell = (entries: ReadonlyArray<readonly [string, string]>): Map<string, string> =>
    new Map(entries.map(([name, id]) => [key(name), id]))
  const world = spell(
    maps.world.regions.flatMap((r) =>
      [r.name, ...(maps.world.aliases[r.name] ?? [])].map((n): [string, string] => [n, r.name])
    )
  )
  const tiles = new Map(
    Object.entries(maps.tiles).map(([map, grid]) => [
      map,
      spell(
        grid.flatMap((t): Array<[string, string]> => [
          [t.name, t.code],
          [t.code, t.code]
        ])
      )
    ])
  )
  const built = { world, tiles }

  indexed.set(maps, built)

  return built
}

export const isTiles = (maps: Maps, map: string): boolean => map in maps.tiles

export function region(maps: Maps, { map, label }: Place): string | undefined {
  const n = names(maps)

  return (isTiles(maps, map) ? n.tiles.get(map) : n.world)?.get(key(label ?? ''))
}

export interface Place {
  map: string
  label: string | undefined
}

// The name a region is listed under: the country itself, or the state's full name for a code.
export function canonical(maps: Maps, place: Place): string | undefined {
  const id = region(maps, place)

  if (!isTiles(maps, place.map)) {
    return id
  }

  return maps.tiles[place.map].find((t) => t.code === id)?.name
}

export function regionCount(maps: Maps, map: string): number {
  return isTiles(maps, map) ? maps.tiles[map].length : maps.world.regions.length
}

// The map is the one that knows most of the labels; a tie goes to the world.
export function mapFor(maps: Maps, labels: ReadonlyArray<string>): string {
  const hits = (map: string): number =>
    labels.filter((label) => region(maps, { map, label })).length
  let best = 'world'

  for (const map of Object.keys(maps.tiles)) {
    if (hits(map) > hits(best)) {
      best = map
    }
  }

  return best
}
