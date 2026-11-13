import { world } from './world.js'
import { brazil } from './brazil.js'

// Matching ignores case and accents, so "sao paulo", "São Paulo" and "SAO PAULO" are one name.
const key = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const worldAliases = {
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

function names(regions, aliases, id) {
  const out = new Map()
  for (const r of regions) {
    for (const n of [r.name, ...aliases(r)]) {
      out.set(key(n), r[id])
    }
  }

  return out
}

export const MAPS = {
  world: {
    kind: 'geo',
    ...world,
    names: names(world.regions, (r) => worldAliases[r.name] ?? [], 'name')
  },
  brazil: { kind: 'tiles', regions: brazil, names: names(brazil, (r) => [r.code], 'code') }
}

export const region = (map, label) => MAPS[map].names.get(key(label ?? ''))

// The map is the one that knows most of the labels; a tie goes to the world.
export const mapFor = (labels) => {
  const hits = (m) => labels.filter((l) => region(m, l)).length
  return hits('brazil') > hits('world') ? 'brazil' : 'world'
}
