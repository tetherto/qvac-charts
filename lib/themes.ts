import type { Row } from './spec.ts'

export interface Theme {
  bg: string
  text: string
  muted: string
  faint: string
  accent: string
  base: string
  palette: ReadonlyArray<string>
}

export type ThemeName = 'dark' | 'light'

export const themes: Readonly<Record<ThemeName, Theme>> = {
  dark: {
    bg: '#0c1824',
    text: '#f4efe6',
    muted: '#8fa3b8',
    faint: 'rgba(244,239,230,0.10)',
    accent: '#ffb703',
    base: '#3a5a7a',
    palette: [
      '#ffb703',
      '#fb8500',
      '#2a9d8f',
      '#8ecae6',
      '#e63946',
      '#219ebc',
      '#cdb4db',
      '#a7c957'
    ]
  },
  light: {
    bg: '#f5efe3',
    text: '#14213d',
    muted: '#5c677d',
    faint: 'rgba(20,33,61,0.10)',
    accent: '#e63946',
    base: '#9aa9bd',
    palette: [
      '#e63946',
      '#f4a261',
      '#2a9d8f',
      '#457b9d',
      '#1d3557',
      '#e9c46a',
      '#8d99ae',
      '#6d597a'
    ]
  }
}

export interface Palette {
  t: Theme
  highlight: string | undefined
}

export interface ColorKey {
  label?: string | undefined
  group?: string | undefined
}

// The highlight takes the accent; otherwise a colour per series, or per item when there is one series.
export function colors(
  items: ReadonlyArray<ColorKey>,
  { t, highlight }: Palette
): (d: ColorKey) => string {
  const groups = [...new Set(items.map((d) => d.group).filter(Boolean))]

  return (d) => {
    if (d.label && d.label === highlight) return t.accent

    if (d.group && groups.length > 1) {
      return t.palette[(groups.indexOf(d.group) + 1) % t.palette.length]
    }

    return t.palette[(items.indexOf(d) + 1) % t.palette.length]
  }
}

export interface Ramp {
  shade: (v: number) => string
  lo: number
  hi: number
}

// One hue from faint to the accent: a map reads intensity, not categories.
export function ramp(data: ReadonlyArray<Row>, t: Theme): Ramp {
  const values = data.map((d) => d.value)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const shade = (v: number): string =>
    mix(t.bg, { to: t.accent, f: 0.28 + 0.72 * (hi === lo ? 1 : (v - lo) / (hi - lo)) })

  return { shade, lo, hi }
}

interface Blend {
  to: string
  f: number
}

function mix(from: string, { to, f }: Blend): string {
  const [x, y] = [from, to].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)))

  return (
    '#' +
    x
      .map((v, i) =>
        Math.round(v + (y[i] - v) * f)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  )
}

const luma = (hex: string): number =>
  [1, 3, 5].reduce((s, i, k) => s + parseInt(hex.slice(i, i + 2), 16) * [0.299, 0.587, 0.114][k], 0)

// Ink that reads on a filled tile: white on dark fills, the theme's darker colour on light ones.
export function contrast(fill: string, t: Theme): string {
  if (luma(fill) < 150) return '#ffffff'

  return luma(t.bg) < luma(t.text) ? t.bg : t.text
}
