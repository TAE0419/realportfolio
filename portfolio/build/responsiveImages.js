import { createHash } from 'node:crypto'
import { access, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

sharp.cache({ files: 0 })

export async function responsiveImages(filename, cacheDirectory) {
  if (!/\.(?:png|jpe?g|webp|avif)$/i.test(filename)) return null
  const metadata = await sharp(filename).metadata()
  // Animated artwork must keep all frames rather than becoming a still image.
  if (metadata.pages > 1) return null
  const source = await stat(filename)
  const key = createHash('sha256').update(`v1:${filename}:${source.size}:${source.mtimeMs}`).digest('hex').slice(0, 20)
  const { width, height } = metadata.autoOrient || metadata
  const widths = [...new Set([640, 1280, 1920, 2560].map(size => Math.min(size, width)))].sort((a, b) => a - b)
  await mkdir(cacheDirectory, { recursive: true })
  const variants = []
  for (const size of widths) {
    const output = path.join(cacheDirectory, `${key}-${size}.webp`)
    try { await access(output) } catch {
      await sharp(filename).rotate().resize({ width: size, withoutEnlargement: true })
        .webp({ quality: 86, effort: 4 }).toFile(output)
    }
    variants.push({ filename: output, width: size, height: Math.round(height * size / width) })
  }
  return variants
}
