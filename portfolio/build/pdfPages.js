import { createHash } from 'node:crypto'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas } from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const pdfRoot = path.dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json')))

export async function pdfPages(filename, cacheDirectory) {
  const hash = createHash('sha256').update('v2:webp90:2400:4096')
  for await (const chunk of createReadStream(filename)) hash.update(chunk)
  const key = hash.digest('hex').slice(0, 20)
  const directory = path.join(cacheDirectory, key)
  const manifest = path.join(directory, 'pages.json')
  try {
    const pages = JSON.parse(await readFile(manifest, 'utf8'))
    await Promise.all(pages.map(page => access(path.join(directory, page.file))))
    return pages.map(page => ({ filename: path.join(directory, page.file), width: page.width, height: page.height }))
  } catch {
    // A missing or incomplete cache is regenerated from the unchanged PDF.
  }
  await mkdir(directory, { recursive: true })
  const task = getDocument({
    data: new Uint8Array(await readFile(filename)),
    cMapUrl: `${path.join(pdfRoot, 'cmaps').replace(/\\/g, '/')}/`,
    cMapPacked: true,
    standardFontDataUrl: `${path.join(pdfRoot, 'standard_fonts').replace(/\\/g, '/')}/`,
    wasmUrl: `${path.join(pdfRoot, 'wasm').replace(/\\/g, '/')}/`,
    useSystemFonts: true,
    isEvalSupported: false,
  })
  const pages = []
  try {
    const document = await task.promise
    // Render sequentially and cap pixels to keep large source PDFs out of browser memory.
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number)
      const original = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: Math.min(2400 / original.width, 4096 / original.height) })
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      await page.render({ canvas, viewport }).promise
      const file = `page-${number}.webp`
      await writeFile(path.join(directory, file), await canvas.encode('webp', 90))
      pages.push({ file, width: canvas.width, height: canvas.height })
      canvas.width = 1
      canvas.height = 1
      page.cleanup()
    }
    await writeFile(manifest, JSON.stringify(pages))
  } finally {
    await task.destroy()
  }
  return pages.map(page => ({ filename: path.join(directory, page.file), width: page.width, height: page.height }))
}
