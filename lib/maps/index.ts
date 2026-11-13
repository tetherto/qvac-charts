import { world } from './world.ts'
import { brazil, type Tile } from './brazil.ts'

// Matching ignores case and accents, so "sao paulo", "São Paulo" and "SAO PAULO" are one name.
const key = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const worldAliases: Readonly<Record<string, ReadonlyArray<string>>> = {
  'United States': [
    'USA',
    'US',
    'U.S.',
    'United States of America',
    'America',
    'Estados Unidos',
    'EUA'
  ],
  'United Kingdom': ['UK', 'Britain', 'Great Britain', 'England', 'Reino Unido'],
  'United Arab Emirates': ['UAE', 'Emirados Árabes Unidos', 'Emirados Árabes'],
  Russia: ['Russian Federation', 'Rússia'],
  'South Korea': ['Korea', 'Republic of Korea', 'Coreia do Sul'],
  'North Korea': ['Coreia do Norte'],
  Czechia: ['Czech Republic', 'República Tcheca', 'Tchéquia'],
  Turkey: ['Türkiye', 'Turquia'],
  "Côte d'Ivoire": ['Ivory Coast', 'Costa do Marfim'],
  'DR Congo': [
    'Democratic Republic of the Congo',
    'Congo-Kinshasa',
    'República Democrática do Congo'
  ],
  Congo: ['Republic of the Congo', 'Congo-Brazzaville'],
  Myanmar: ['Burma', 'Mianmar'],
  Netherlands: ['Holland', 'Holanda', 'Países Baixos'],
  Vietnam: ['Viet Nam', 'Vietnã'],
  Eswatini: ['Swaziland'],
  Brazil: ['Brasil'],
  Germany: ['Alemanha'],
  France: ['França'],
  Japan: ['Japão'],
  India: ['Índia'],
  Mexico: ['México'],
  Canada: ['Canadá'],
  Italy: ['Itália'],
  Spain: ['Espanha'],
  Nigeria: ['Nigéria'],
  'South Africa': ['África do Sul'],
  'Saudi Arabia': ['Arábia Saudita'],
  Australia: ['Austrália'],
  Switzerland: ['Suíça'],
  Sweden: ['Suécia'],
  Norway: ['Noruega'],
  Poland: ['Polônia'],
  Egypt: ['Egito'],
  Iran: ['Irã'],
  Iraq: ['Iraque'],
  Pakistan: ['Paquistão'],
  Philippines: ['Filipinas'],
  Thailand: ['Tailândia'],
  Malaysia: ['Malásia'],
  Ukraine: ['Ucrânia'],
  Belgium: ['Bélgica'],
  Austria: ['Áustria'],
  Denmark: ['Dinamarca'],
  Finland: ['Finlândia'],
  Ireland: ['Irlanda'],
  Greece: ['Grécia'],
  'New Zealand': ['Nova Zelândia'],
  Morocco: ['Marrocos'],
  Kenya: ['Quênia'],
  Ethiopia: ['Etiópia'],
  Colombia: ['Colômbia'],
  Indonesia: ['Indonésia'],
  Uruguay: ['Uruguai'],
  Paraguay: ['Paraguai'],
  Bolivia: ['Bolívia'],
  Ecuador: ['Equador'],
  Qatar: ['Catar'],
  Algeria: ['Argélia'],
  Romania: ['Romênia'],
  Hungary: ['Hungria'],
  Kazakhstan: ['Cazaquistão'],
  Afghanistan: ['Afeganistão'],
  'Dominican Republic': ['República Dominicana']
}

export type MapName = 'world' | 'brazil'

export interface GeoRegion {
  name: string
  d: string
  cx: number
  cy: number
}

// Every spelling a model may write, each pointing at the one id the map draws.
function names(entries: ReadonlyArray<readonly [string, string]>): Map<string, string> {
  return new Map(entries.map(([name, id]) => [key(name), id]))
}

const worldNames = names(
  world.regions.flatMap((r) =>
    [r.name, ...(worldAliases[r.name] ?? [])].map((n) => [n, r.name] as const)
  )
)

const brazilNames = names(
  brazil.flatMap((t) => [[t.name, t.code] as const, [t.code, t.code] as const])
)

export const WORLD = world
export const TILES: Readonly<Record<MapName, ReadonlyArray<Tile>>> = { world: [], brazil }

export const isTiles = (map: MapName): boolean => TILES[map].length > 0

export function region(map: MapName, label: string | undefined): string | undefined {
  return (map === 'world' ? worldNames : brazilNames).get(key(label ?? ''))
}

// The name a region is listed under: the country itself, or the state's full name for a code.
export function canonical(map: MapName, label: string | undefined): string | undefined {
  const id = region(map, label)

  if (!isTiles(map)) {
    return id
  }

  return TILES[map].find((t) => t.code === id)?.name
}

export function regionCount(map: MapName): number {
  return isTiles(map) ? TILES[map].length : world.regions.length
}

// The map is the one that knows most of the labels; a tie goes to the world.
export function mapFor(labels: ReadonlyArray<string>): MapName {
  const hits = (m: MapName): number => labels.filter((l) => region(m, l)).length

  return hits('brazil') > hits('world') ? 'brazil' : 'world'
}
