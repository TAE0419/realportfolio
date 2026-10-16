export function isProjectVideo(url) {
  if (typeof url !== 'string' || !url.trim()) return false
  try {
    return /\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(new URL(url.trim(), 'https://project.invalid/').pathname)
  } catch {
    return false
  }
}

export function isProjectVideoPage(page) {
  return Array.isArray(page?.images) && page.images.length > 0 && page.images.every(image => isProjectVideo(image.url))
}

export function isProjectPdf(url) {
  if (typeof url !== 'string' || !url.trim()) return false
  try {
    return /\.pdf$/i.test(new URL(url.trim(), 'https://project.invalid/').pathname)
  } catch {
    return false
  }
}
