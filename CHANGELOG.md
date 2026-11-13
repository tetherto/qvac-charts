# Changelog

All notable changes to `@qvac/charts` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While the major version is `0`, a breaking change bumps the minor version.

## [Unreleased]

### Added

- `Chart.from(spec)` reads a chart spec and `chart.toSVG({ theme })` draws it as a 1080×1350 SVG, dark or light. `chart.summary` describes it in one line for the model. `Chart.schema` is the spec's JSON Schema, for a model to fill. The renderer picks one of 14 chart types from the shape of the data.

[Unreleased]: https://github.com/tetherto/qvac-charts/commits/main
