# @qvac/charts

Renders a small JSON chart spec, written by a local model, into an SVG in an editorial style. No runtime dependencies; runs on Bare and Node.

## Usage

The renderer is being ported from the QVAC harness proof of concept; the API lands with it.

## Development

```sh
npm install
npm run lint
npm test
```

`npm test` runs the suite on Node and on Bare. `npm run build:lib` compiles the TypeScript source to `dist-lib/`, which is what the package publishes.

## License

Apache-2.0
