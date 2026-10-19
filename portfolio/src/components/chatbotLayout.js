export const chatMotion = {
  connecting: ['lifting', 280],
  lifting: ['revealing', 460],
  revealing: ['open', 600],
  concealing: ['lowering', 480],
  lowering: ['disconnecting', 460],
  disconnecting: ['closed', 280],
}

export function chatFacePath(width, height, inputHeight, bottom, gutter, radius) {
  const right = width - gutter
  const top = height - bottom - inputHeight
  const end = height - bottom
  const curve = Math.min(22, inputHeight / 2)
  // One continuous outline makes the left notch an actual cutout, not an overlay.
  return `M ${radius} 0 H ${width} V ${height - radius} Q ${width} ${height} ${width - radius} ${height} H 0 V ${end} H ${right - curve} A ${curve} ${curve} 0 0 0 ${right} ${end - curve} V ${top + curve} A ${curve} ${curve} 0 0 0 ${right - curve} ${top} H 0 V ${radius} Q 0 0 ${radius} 0 Z`
}
