import { aliases } from './lib/maps/aliases.ts'
import { brazil } from './lib/maps/brazil.ts'
import { world } from './lib/maps/world.ts'
import type { Maps } from './lib/places.ts'

export type { Maps }

// The world as projected country shapes, Brazil as a grid of its states.
export const maps: Maps = {
  world: { ...world, aliases },
  tiles: { brazil }
}
