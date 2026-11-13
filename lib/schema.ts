// The grammar enforces every bound here, so each one is a mistake the model can no longer make.

const item = {
  type: 'object',
  properties: {
    // Place names stay free text, matched to the map: a closed list of countries slowed generation 25%.
    label: { type: 'string', maxLength: 32 },
    value: { type: 'number' },
    group: { type: 'string', maxLength: 24 }
  },
  required: ['label', 'value'],
  additionalProperties: false
}

export const SHAPES = ['ranking', 'parts', 'over-time', 'change', 'sizes', 'places']
export const VARIANTS = [
  'bar',
  'radial',
  'donut',
  'waffle',
  'treemap',
  'stacked',
  'bubbles',
  'line',
  'column'
]
// No unit shares a first letter with a scale word: a model starting "b" for billion is forced into it.
export const UNITS = ['number', 'percent', 'dollars', 'euros', 'pounds', 'reais']
export const SCALES = ['ones', 'thousands', 'millions', 'billions', 'trillions']

export const chartSchema = {
  type: 'object',
  properties: {
    shape: { enum: SHAPES },
    variant: { enum: VARIANTS },
    title: { type: 'string', maxLength: 64 },
    subtitle: { type: 'string', maxLength: 110 },
    data: { type: 'array', items: item, minItems: 2, maxItems: 30 },
    highlight: { type: 'string', maxLength: 32 },
    scale: { enum: SCALES },
    unit: { enum: UNITS },
    annotations: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', maxLength: 32 },
          text: { type: 'string', maxLength: 70 }
        },
        required: ['label', 'text'],
        additionalProperties: false
      }
    },
    callout: { enum: ['none', 'share', 'growth', 'ratio'] },
    source: { type: 'string', maxLength: 120 }
  },
  required: [
    'shape',
    'title',
    'subtitle',
    'data',
    'highlight',
    'scale',
    'unit',
    'callout',
    'source'
  ],
  additionalProperties: false
}
