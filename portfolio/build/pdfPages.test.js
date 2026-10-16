import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { pdfPages } from './pdfPages.js'
import projectAssetsPlugin from './projectAssets.js'

function fixturePdf() {
  const red = '1 0 0 rg 0 0 600 300 re f'
  const blue = '0 0 1 rg 0 0 300 600 re f'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 300] /Resources << >> /Contents 5 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 600] /Resources << >> /Contents 6 0 R >>',
    `<< /Length ${red.length} >>\nstream\n${red}\nendstream`,
    `<< /Length ${blue.length} >>\nstream\n${blue}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf)
}

test('renders every PDF page in order, preserves ratios and originals, and reuses the cache', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'portfolio-pdf-'))
  try {
    const filename = path.join(root, 'brochure.pdf')
    const original = fixturePdf()
    await writeFile(filename, original)
    const cache = path.join(root, 'cache')
    const pages = await pdfPages(filename, cache)
    assert.equal(pages.length, 2)
    assert.equal(pages[0].width / pages[0].height, 2)
    assert.equal(pages[1].width / pages[1].height, 0.5)
    for (const [index, page] of pages.entries()) {
      const data = await readFile(page.filename)
      const metadata = await sharp(data).metadata()
      assert.equal(metadata.format, 'webp')
      assert.equal(metadata.width, page.width)
      assert.equal(metadata.height, page.height)
      const { data: pixel } = await sharp(data).resize(1, 1).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      assert.ok(index === 0 ? pixel[0] > 200 && pixel[2] < 20 : pixel[2] > 200 && pixel[0] < 20)
    }
    const modified = await Promise.all(pages.map(page => stat(page.filename).then(file => file.mtimeMs)))
    assert.deepEqual(await pdfPages(filename, cache), pages)
    assert.deepEqual(await Promise.all(pages.map(page => stat(page.filename).then(file => file.mtimeMs))), modified)
    assert.deepEqual(await readFile(filename), original)
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})

test('bundles PDF preview images without deploying the original PDF', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'portfolio-pdf-assets-'))
  try {
    await mkdir(path.join(root, 'src/data'), { recursive: true })
    await mkdir(path.join(root, 'src/assets'), { recursive: true })
    await writeFile(path.join(root, 'src/assets/brochure.pdf'), fixturePdf())
    await sharp({ create: { width: 80, height: 40, channels: 3, background: '#336699' } })
      .png().toFile(path.join(root, 'src/assets/after.png'))
    await writeFile(path.join(root, 'src/data/projects.json'), JSON.stringify({
      images: [{ url: '/brochure.pdf' }, { url: '/after.png' }],
    }))
    const plugin = projectAssetsPlugin()
    plugin.configResolved({ root })
    const source = await plugin.load.call({ addWatchFile() {} }, plugin.resolveId('virtual:project-images'))
    assert.ok(source.includes('"/brochure.pdf": [{src:'))
    assert.ok(source.includes('after.png?url'))
    assert.ok(!source.includes('brochure.pdf?url'))
    const variables = [...source.matchAll(/^import (\w+) from /gm)].map(match => match[1])
    assert.equal(variables.length, 3)
    assert.equal(new Set(variables).size, variables.length)
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
