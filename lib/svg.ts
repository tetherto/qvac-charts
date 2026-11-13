export interface TextStyle {
  x: number
  y: number
  size: number
  fill: string
  weight?: number
  anchor?: 'start' | 'middle' | 'end'
  spacing?: number
}

export function text(str: string | number, style: TextStyle): string {
  const { x, y, size, fill, weight = 400, anchor = 'start', spacing = 0 } = style
  const esc = String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}">${esc}</text>`
}

// Text outlined in the background colour, so it stays legible over a map.
export interface HaloStyle extends TextStyle {
  stroke: string
}

export function halo(str: string, { stroke, ...style }: HaloStyle): string {
  return text(str, style).replace(
    '<text ',
    `<text stroke="${stroke}" stroke-width="6" stroke-linejoin="round" paint-order="stroke" `
  )
}

export interface Measure {
  width: number
  size: number
}

// Without a DOM text cannot be measured: a line holds what an average character width allows.
export function wrap(str: string, { width, size }: Measure): string[] {
  const per = Math.floor(width / (size * 0.54))
  const lines: string[] = []
  let line = ''

  for (const word of str.split(/\s+/)) {
    if (line && (line + ' ' + word).length > per) {
      lines.push(line)
      line = word
    } else {
      line = line ? line + ' ' + word : word
    }
  }

  if (line) {
    lines.push(line)
  }

  return lines
}

// Bare and Node differ in the last bit of sin and cos; two decimals keep their SVG identical.
export function fixed(svg: string): string {
  return svg.replace(/<[^>]+>/g, (tag) =>
    tag.replace(/="[^"]*"/g, (attr) =>
      attr.replace(/-?\d+\.\d{3,}/g, (n) => String(Math.round(Number(n) * 100) / 100))
    )
  )
}
