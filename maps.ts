import { aliases } from './lib/maps/aliases.ts'
import { loaders, members } from './lib/maps/continents/index.ts'
import { world } from './lib/maps/world.ts'
import { key, type GeoMap, type GeoRegion, type Maps } from './lib/places.ts'

export type { GeoMap, GeoRegion, Maps }

// The world as projected country shapes; no continent until a host asks for one.
export const maps: Maps = { world: { ...world, aliases }, continents: {} }

// The continents a chart can be drawn on, closer than the world.
export const continents: ReadonlyArray<string> = Object.keys(loaders)

const sets = new Map(Object.entries(members).map(([id, names]) => [id, new Set(names)]))

// The world, and the continent holding most places; the chart uses it when it holds them all.
export async function mapsFor(labels: ReadonlyArray<string>): Promise<Maps> {
  let best: { id: string; hits: number } | undefined

  for (const [id, names] of sets) {
    const hits = labels.filter((label) => names.has(key(label))).length

    if (hits > 0 && (!best || hits > best.hits)) {
      best = { id, hits }
    }
  }

  if (!best) {
    return maps
  }

  return { ...maps, continents: { [best.id]: await loaders[best.id]() } }
}
