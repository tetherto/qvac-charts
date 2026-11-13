# @qvac/charts

Renders a small JSON chart spec, written by a local model, into an SVG in an editorial style. No runtime dependencies; runs on Bare and Node.

## Usage

```js
import { Chart } from '@qvac/charts'

// Chart.schema is the JSON Schema a model fills, through responseFormat or a tool's parameters
const chart = Chart.from({
  shape: 'ranking',
  title: 'USDT dominates stablecoin supply',
  subtitle: 'Supply in billions of dollars',
  data: [
    { label: 'USDT', value: 187 },
    { label: 'USDC', value: 75 },
    { label: 'DAI', value: 4.6 }
  ],
  highlight: 'USDT',
  scale: 'billions',
  unit: 'dollars',
  callout: 'ratio',
  source: 'User data'
})

chart.type // 'ranked-bar'
chart.summary // 'Ranked bar, 3 items, highlight USDT, $187B'
chart.toSVG({ theme: 'light' }) // a 1080×1350 SVG string
```

`summary` is one line a model can talk about the chart from, without seeing it. The model describes the data; the package picks the chart, does the arithmetic and draws it. There are 14 chart types, including a world choropleth, a bubble map and a grid of Brazilian states.

## Development

```sh
npm install
npm run lint
npm test
```

`npm test` runs the suite on Node and on Bare. The snapshot tests hash the SVG of every spec in `test/fixtures/specs/`; after an intended change to the drawing, look at the charts and run `npm run test:snapshots` to record the new hashes. `npm run build:lib` compiles the TypeScript source to `dist-lib/`, which is what the package publishes.

## License

Apache-2.0
