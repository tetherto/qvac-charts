import test from 'brittle'
import { Chart } from '../index.ts'

test('the entry exports the Chart class', (t) => {
  t.is(typeof Chart, 'function')
})
