import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import projectAssetsPlugin from './projectAssets.js'
import { normalizeProjectImagePath } from '../src/data/imagePaths.js'

test('normalizes local image paths without treating remote URLs as assets', () => {
  for (const value of ['/frontend/liv/product.png', 'frontend/liv/product.png', '/src/assets/frontend/liv/product.png', 'assets\\frontend\\liv\\product.png']) {
    assert.equal(normalizeProjectImagePath(value), '/frontend/liv/product.png')
  }
  for (const value of ['/', '', null, '../outside.png', '/frontend/../outside.png', 'https://example.com/image.png', 'data:image/png;base64,AAAA', '//example.com/image.png']) {
    assert.equal(normalizeProjectImagePath(value), null)
  }
})

test('imports only JSON-referenced thumbnails and gallery images and updates without registration', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'portfolio-images-'))
  try {
    const dataDirectory = path.join(root, 'src/data')
    const assetDirectory = path.join(root, 'src/assets/frontend/new-project')
    await mkdir(dataDirectory, { recursive: true })
    await mkdir(assetDirectory, { recursive: true })
    const fixture = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#336699' } }).png().toBuffer()
    for (const filename of ['product.png', 'second.webp', 'slide 1.png', 'unused.png', 'new.png']) {
      await writeFile(path.join(assetDirectory, filename), fixture)
    }
    const dataFile = path.join(dataDirectory, 'projects.json')
    await writeFile(dataFile, JSON.stringify({ projects: [{ pages: {
      project: { thumbnail: '/frontend/new-project/product.png', thumbnail2: '/assets/frontend/new-project/second.webp' },
      presentation: { images: [{ url: '/src/assets/frontend/new-project/slide 1.png' }, { url: '/frontend/new-project/product.png' }, { url: 'https://example.com/remote.jpg' }, { url: '/images/missing.png' }] },
      link: { url: '/frontend/not-an-image' },
    } }] }))
    const watched = []
    const plugin = projectAssetsPlugin()
    plugin.configResolved({ root })
    const id = plugin.resolveId('virtual:project-images')
    const context = { addWatchFile: file => watched.push(file) }
    const source = await plugin.load.call(context, id)
    assert.equal(source.match(/^import /gm).length, 12)
    assert.ok(source.includes('export const cardImages'))
    assert.ok(source.includes('480w'))
    assert.ok(source.includes('960w'))
    assert.ok(source.includes('export const detailImages'))
    assert.ok(source.includes('1280w'))
    assert.ok(source.includes('/frontend/new-project/second.webp'))
    assert.ok(source.includes('/frontend/new-project/slide 1.png'))
    assert.ok(!source.includes('product.png?url'))
    for (const unexpected of ['unused.png', 'new.png', 'remote.jpg', 'missing.png', 'not-an-image']) assert.ok(!source.includes(unexpected))
    assert.ok(watched.includes(dataFile))

    await writeFile(dataFile, JSON.stringify({ projects: [{ pages: { project: { thumbnail: '/frontend/new-project/new.png' } } }] }))
    const updated = await plugin.load.call(context, id)
    assert.equal(updated.match(/^import /gm).length, 6)
    assert.ok(updated.includes('/frontend/new-project/new.png'))
    assert.ok(!updated.includes('product.png'))

    const virtualModule = { id }
    const dataModule = { id: dataFile }
    let invalidated = 0
    const server = { moduleGraph: { getModuleById: () => virtualModule, invalidateModule: () => invalidated++ } }
    const modules = plugin.handleHotUpdate({ file: dataFile, server, modules: [dataModule] })
    assert.deepEqual(modules, [dataModule, virtualModule])
    assert.equal(invalidated, 1)
    assert.equal(plugin.handleHotUpdate({ file: path.join(root, 'unrelated.js'), server, modules: [] }), undefined)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
