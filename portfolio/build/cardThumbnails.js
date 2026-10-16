import { createHash } from 'node:crypto'
import { access, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

// Allow watched originals to be replaced on Windows after a preview is generated.
sharp.cache({ files: 0 })

export async function cardThumbnails(filename, cacheDirectory) {
  const source = await stat(filename)
  const key = createHash('sha256').update(`v1:${filename}:${source.size}:${source.mtimeMs}`).digest('hex').slice(0, 20)
  await mkdir(cacheDirectory, { recursive: true })
  const variants = []
  // Keep decoding and encoding off the browser's animation path, one size at a time.
  for (const width of [480, 960, 1920]) {
    const output = path.join(cacheDirectory, `${key}-${width}.webp`)
    try {
      await access(output)
    } catch {
      await sharp(filename, { animated: false }).rotate()
        .resize(width, Math.round(width * 9 / 16), { fit: 'cover' })
        .webp({ quality: 80 }).toFile(output)
    }
    variants.push({ filename: output, width })
  }
  return variants
}
