import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Runs at publish time: the test lanes need source, and publishConfig cannot override exports

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(root, 'package.json')
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'))

const compiled = (target) => {
  if (!target.endsWith('.ts')) return target
  const base = './dist-lib/' + target.slice(2, -'.ts'.length)
  return { types: `${base}.d.ts`, default: `${base}.js` }
}

for (const [key, target] of Object.entries(pkg.exports)) {
  pkg.exports[key] = compiled(target)
}

const missing = Object.values(pkg.exports)
  .flatMap((t) => (typeof t === 'string' ? [t] : Object.values(t)))
  .filter((t) => !fs.existsSync(path.join(root, t)))
if (missing.length > 0) {
  throw new Error(`[prepare-publish] missing after build-lib:\n  ${missing.join('\n  ')}`)
}

fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n')
console.log(`[prepare-publish] ${Object.keys(pkg.exports).length} exports point at dist-lib/`)
