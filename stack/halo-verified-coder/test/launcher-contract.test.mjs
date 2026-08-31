import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const here = dirname(fileURLToPath(import.meta.url))
const launcher = join(here, '..', '..', 'Launch-Halo.ps1')
const supervisor = join(here, '..', '..', 'Run-HaloCockpit.ps1')

test('cockpit launcher preserves stdout, stderr, pid, and exit evidence', async () => {
  const source = `${await readFile(launcher, 'utf8')}\n${await readFile(supervisor, 'utf8')}`
  assert.match(source, /RedirectStandardOutput/)
  assert.match(source, /RedirectStandardError/)
  assert.match(source, /halo-cockpit\.pid\.json/)
  assert.match(source, /ExitCode/)
  assert.match(source, /health/i)
  assert.match(source, /--allow-build=/)
  assert.match(source, /--no-open/)
})
