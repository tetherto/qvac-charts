import type { Chart } from './spec.ts'

export type Format = (v: number, decimals?: number) => string

export function formatter(chart: Chart): Format {
  return (v, decimals = chart.decimals) =>
    (v < 0 ? '-' : '') +
    (chart.prefix ?? '') +
    Math.abs(v).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }) +
    (chart.suffix ?? '')
}
