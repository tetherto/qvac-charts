import { normalize, render } from './lib/render.js'
import { chartSchema } from './lib/schema.js'

export type Theme = 'dark' | 'light'

export interface SVGOptions {
  theme?: Theme
}

interface Normalized {
  type: string
}

export class Chart {
  static schema = chartSchema

  // The renderer normalizes on its own; the normalized copy here only answers questions about the chart.
  static from(spec: object): Chart {
    return new Chart(spec, normalize(spec))
  }

  readonly type: string
  private spec: object

  private constructor(spec: object, normalized: Normalized) {
    this.spec = spec
    this.type = normalized.type
  }

  toSVG({ theme = 'dark' }: SVGOptions = {}): string {
    return render(this.spec, { theme })
  }
}
