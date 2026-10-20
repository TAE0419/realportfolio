import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { responsiveImages } from './responsiveImages.js'

test('detail variants preserve aspect ratio, transparency, originals and their cache', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'portfolio-details-'))
  try {
    const file = path.join(root, 'detail.png')
    await sharp({ create: { width: 2000, height: 3000, channels: 4, background: '#3142ff80' } }).png().toFile(file)
    const before = await readFile(file)
    const variants = await responsiveImages(file, path.join(root, 'cache'))
    assert.deepEqual(variants.map(item => item.width), [640, 1280, 1920, 2000])
    for (const item of variants) {
      const info = await sharp(item.filename).metadata()
      assert.equal(info.width, item.width)
      assert.equal(info.height, item.height)
      assert.equal(info.height / info.width, 1.5)
      assert.equal(info.hasAlpha, true)
    }
    const times = await Promise.all(variants.map(item => stat(item.filename).then(s => s.mtimeMs)))
    assert.deepEqual(await responsiveImages(file, path.join(root, 'cache')), variants)
    assert.deepEqual(await Promise.all(variants.map(item => stat(item.filename).then(s => s.mtimeMs))), times)
    assert.deepEqual(await readFile(file), before)
    assert.equal(await responsiveImages('video.mp4', root), null)
    assert.equal(await responsiveImages('artwork.gif', root), null)
    const small = path.join(root, 'small.png')
    await sharp({ create: { width: 240, height: 120, channels: 3, background: '#3142ff' } }).png().toFile(small)
    assert.deepEqual((await responsiveImages(small, path.join(root, 'cache'))).map(item => item.width), [240])
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
