export function normalizeProjectImagePath(value) {
  if (typeof value !== 'string') return null
  const path = value.trim().replace(/\\/g, '/')
  if (!path || path === '/' || /^(?:https?:|data:|blob:|\/\/)/i.test(path)) return null
  const normalized = `/${path.replace(/^\/+/, '')}`.replace(/^\/(?:src\/)?assets\//, '/')
  if (normalized.split('/').includes('..')) return null
  return normalized
}
