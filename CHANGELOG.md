# Changelog

All notable changes to `qvac-charts` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While the major version is `0`, a breaking change bumps the minor version.

## [Unreleased]

### Fixed

- A `change` spec whose items are not each given at two moments throws a `RangeError` from `Chart.from`, instead of a `TypeError` from `toSVG` on an empty chart.

## [0.1.1] - 2026-11-13

### Changed

- The package publishes as `qvac-charts`, imported as `qvac-charts` and `qvac-charts/maps`. Version 0.1.0 never reached npm, so this is the first published release and carries everything listed under [0.1.0](CHANGELOG.md).

## [0.1.0] - 2026-11-13

### Added

- `Chart.from(spec)` reads a chart spec and `chart.toSVG({ theme })` draws it as a 1080×1350 SVG, dark or light. `chart.summary` describes it in one line for the model. `Chart.schema` is the spec's JSON Schema, for a model to fill. The renderer picks one of 14 chart types from the shape of the data.
- `Chart.from` refuses more than 30 items and drops values that are not finite numbers, so a spec from an untrusted prompt cannot stall the renderer.
- `toSVG({ mark })` draws a host's brand mark at the right of the footer; the package itself ships no logo.
- The map data ships as its own entry, `qvac-charts/maps`: pass it as `Chart.from(spec, { maps })` to draw place charts. Without it they are drawn as rankings, and the core stays under 30 KB minified.

[Unreleased]: https://github.com/tetherto/qvac-charts/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/tetherto/qvac-charts/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/tetherto/qvac-charts/releases/tag/v0.1.0
