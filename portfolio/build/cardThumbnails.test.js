import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { cardThumbnails } from './cardThumbnails.js'

test('generates small card variants, reuses the cache, and preserves the original', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'portfolio-card-'))
  try {
    const original = path.join(root, 'product.png')
    const cache = path.join(root, 'cache')
    await sharp({ create: { width: 2400, height: 1800, channels: 4, background: '#4488cc80' } }).png().toFile(original)
    const before = await readFile(original)
    const variants = await cardThumbnails(original, cache)
    assert.deepEqual(variants.map(image => image.width), [480, 960, 1920])
    for (const variant of variants) {
      const info = await sharp(await readFile(variant.filename)).metadata()
      assert.equal(info.format, 'webp')
      assert.equal(info.width, variant.width)
      assert.equal(info.height, variant.width * 9 / 16)
    }
    const modified = await Promise.all(variants.map(image => stat(image.filename).then(file => file.mtimeMs)))
    assert.deepEqual(await cardThumbnails(original, cache), variants)
    assert.deepEqual(await Promise.all(variants.map(image => stat(image.filename).then(file => file.mtimeMs))), modified)
    assert.deepEqual(await readFile(original), before)
    await sharp({ create: { width: 2400, height: 1800, channels: 4, background: '#aabbcc' } }).png().toFile(original)
    const updated = await cardThumbnails(original, cache)
    assert.notEqual(updated[0].filename, variants[0].filename)
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
