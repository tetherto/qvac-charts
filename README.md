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

A spec takes at most 30 items, the bound in `Chart.schema`; `Chart.from` throws a `RangeError` past it, or when no value is a finite number. Values that are not finite, such as `1e400` read from JSON, are dropped.

### Brand mark

The package ships no logo. A host that wants its mark in the footer passes it to `toSVG`; the source line then wraps short of it:

```js
chart.toSVG({ theme: 'dark', mark: { href: 'data:image/png;base64,…', width: 110, height: 48 } })
```

### Maps

The map data is its own entry, so a host that draws no maps does not load it (about 120 KB):

```js
import { Chart } from '@qvac/charts'
import { maps } from '@qvac/charts/maps'

const chart = Chart.from(spec, { maps }) // shape 'places' becomes a choropleth, a bubble map or the Brazil grid
```

Without `maps`, a spec with `shape: 'places'` is drawn as a ranking of its places.

## Development

```sh
bun install
bun run lint
bun run test
```

Dependencies install with bun from `bun.lock`; `bunfig.toml` skips install scripts and any release younger than seven days. `bun run test` runs the suite on Node and on Bare (pinned by `bare-runtime`). The snapshot tests hash the SVG of every spec in `test/fixtures/specs/`; after an intended change to the drawing, look at the charts and run `bun run snapshots:update` to record the new hashes. `bun run build:lib` compiles the TypeScript source to `dist-lib/`, which is what the package publishes.

## License

Apache-2.0
