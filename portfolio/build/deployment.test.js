import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeProjectImagePath } from '../src/data/imagePaths.js'

const root = fileURLToPath(new URL('../', import.meta.url))

test('every JSON media reference exists with Linux-compatible filename casing', async () => {
  const assets = path.join(root, 'src/assets')
  const filenames = new Set()
  for (const file of await readdir(assets, { recursive: true })) {
    if ((await stat(path.join(assets, file))).isFile()) filenames.add(`/${file.replace(/\\/g, '/')}`)
  }
  const references = new Set()
  function collect(value) {
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      const paths = /^thumbnail\d*$/.test(key) ? [child]
        : key === 'images' && Array.isArray(child) ? child.map(item => typeof item === 'string' ? item : item?.url) : []
      for (const item of paths) {
        const normalized = normalizeProjectImagePath(item)
        if (normalized) references.add(normalized)
      }
      collect(child)
    }
  }
  for (const file of await readdir(path.join(root, 'src/data'))) {
    if (file.endsWith('.json')) collect(JSON.parse((await readFile(path.join(root, 'src/data', file), 'utf8')).replace(/^\uFEFF/, '')))
  }
  assert.ok(references.size > 0)
  assert.deepEqual([...references].filter(file => !filenames.has(file)), [])
})
