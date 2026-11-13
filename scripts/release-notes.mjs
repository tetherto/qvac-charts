import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Prints the body of a version's GitHub release: its CHANGELOG.md section and compare link.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const version = (process.argv[2] ?? '').replace(/^v/, '')
const lines = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8').split('\n')

const own = lines.some((l) => l.startsWith(`## [${version}] `))
// a prerelease with no section of its own ships [Unreleased], compared from the last release
const heading = own || !version.includes('-') ? version : 'Unreleased'

const start = lines.findIndex((l) => l === `## [${heading}]` || l.startsWith(`## [${heading}] `))
const end = lines.findIndex((l, i) => i > start && l.startsWith('## ['))
const found = lines.find((l) => l.startsWith(`[${heading}]: `))
const link = own
  ? found
  : found?.replace(/^\[Unreleased\]/, `[${version}]`).replace(/HEAD$/, `v${version}`)

if (!version || start === -1 || !link) {
  console.error(`CHANGELOG.md has no section and compare link for ${version || '(none)'}`)
  process.exit(1)
}

const section = lines
  .slice(start + 1, end === -1 ? undefined : end)
  .filter((l) => !/^\[[^\]]+\]: /.test(l))
// a release page resolves no relative link, so pin each outside code to the version's tree
const body = unwrap(section)
  .join('\n')
  .replace(/(```[\s\S]*?```|`[^`\n]*`)|\]\((?![a-z]+:|#)([^)]+)\)/g, (match, code, target) =>
    code ? match : `](https://github.com/tetherto/qvac-charts/blob/v${version}/${target})`
  )
  .trim()

console.log(`${fit(body)}\n\n${link}`)

// a release page breaks the line at every newline, so join a wrapped paragraph back into one
function unwrap(lines) {
  const out = []
  let fenced = false

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      fenced = !fenced
    }

    if (!fenced && continues(out.at(-1), line.trim())) {
      out[out.length - 1] += ` ${line.trim()}`
    } else {
      out.push(line)
    }
  }

  return out
}

function continues(prev, text) {
  if (!text || !prev?.trim()) return false
  if (/^([-*+] |\d+\. |#{1,6} |[>|]|```)/.test(text)) return false
  return !/^\s*(#{1,6} |```)/.test(prev)
}

// GitHub caps a release body at 125000 characters: end at the last whole entry that fits
function fit(body) {
  if (body.length <= 120000) return body
  const rest = `The rest is in [CHANGELOG.md](https://github.com/tetherto/qvac-charts/blob/v${version}/CHANGELOG.md).`
  const cut = body.lastIndexOf('\n- ', 120000 - rest.length)
  return `${body.slice(0, cut).trim()}\n\n${rest}`
}
