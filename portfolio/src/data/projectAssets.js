import images, { cardImages, detailImages, pdfImages } from 'virtual:project-images'
import { normalizeProjectImagePath } from './imagePaths'

export function projectImage(path) {
  if (typeof path !== 'string' || !path.trim() || path.trim() === '/') return null
  const normalized = normalizeProjectImagePath(path)
  return normalized ? images[normalized] || normalized : path.trim()
}

export function projectCardImage(path) {
  return cardImages[normalizeProjectImagePath(path)] || { src: projectImage(path) }
}

export function projectPdfPages(path) {
  return pdfImages[normalizeProjectImagePath(path)] || []
}

export function projectDetailImage(path) {
  return detailImages[normalizeProjectImagePath(path)] || { src: projectImage(path) }
}
