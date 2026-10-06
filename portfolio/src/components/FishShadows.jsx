import { useEffect, useRef } from 'react'

function drawShadow(context, phase) {
  const bend = (x, y) => {
    const tailWeight = (80 - x) / 195
    return [x, y + Math.sin(phase - tailWeight * 2.2) * 14 * tailWeight ** 2]
  }

  // The head stays steady while a travelling curve bends the narrowing body.
  context.beginPath()
  for (const side of [-1, 1]) {
    for (let step = 0; step <= 64; step += 1) {
      const t = side === -1 ? step / 64 : 1 - step / 64
      const x = 80 - t * 155
      const halfWidth = Math.sin(Math.PI * t) ** 0.6 * (22 - t * 16)
      const point = bend(x, side * halfWidth)
      if (side === -1 && step === 0) context.moveTo(...point)
      else context.lineTo(...point)
    }
  }
  context.closePath()
  context.fill()

  context.beginPath()
  context.moveTo(...bend(-68, -2))
  context.bezierCurveTo(...bend(-83, -4), ...bend(-105, -17), ...bend(-115, -21))
  context.bezierCurveTo(...bend(-111, -10), ...bend(-105, -4), ...bend(-102, 0))
  context.bezierCurveTo(...bend(-105, 4), ...bend(-111, 10), ...bend(-115, 21))
  context.bezierCurveTo(...bend(-105, 17), ...bend(-83, 4), ...bend(-68, 2))
  context.closePath()
  context.fill()
}

export default function FishShadows({ seed = 1, areaSelector, bottomBoundarySelector }) {
  const canvasRef = useRef(null)
  const randomSeedRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return
    const section = canvas.parentElement
    const area = areaSelector ? section.querySelector(areaSelector) : null
    const bottomBoundary = bottomBoundarySelector ? section.querySelector(bottomBoundarySelector) : null
    const boundaryPath = bottomBoundary?.querySelector('.wave-row__highlight')
    let bottomClip = null
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const darkColor = window.getComputedStyle(canvas).getPropertyValue('--dark-color').trim()
    let width = 0
    let height = 0
    const verticalBleed = 200
    let swimmingArea = { x: 0, y: 0, width: 1, height: 1 }
    let frame = 0
    let previous = 0
    let visible = false
    let elapsed = 0
    if (randomSeedRef.current === null) {
      randomSeedRef.current = window.crypto.getRandomValues(new Uint32Array(1))[0]
    }
    let randomState = (randomSeedRef.current ^ seed) >>> 0
    const random = () => {
      randomState = (randomState * 1664525 + 1013904223) >>> 0
      return randomState / 4294967296
    }
    const formation = [[0, 0], [-65, -42], [-80, 42], [-140, 6]]
    const groups = []
    const fish = []
    let remaining = 10 + Math.floor(random() * 9)
    while (remaining > 0) {
      let groupSize = groups.length === 0 ? 4 : Math.min(remaining, 2 + Math.floor(random() * 2))
      if (remaining - groupSize === 1) groupSize = remaining === 3 ? 3 : 2
      const group = groups.length
      groups.push({
        x: 0.2 + random() * 0.6,
        y: 0,
        heading: random() * Math.PI * 2,
        speed: 48 + random() * 44,
      })
      for (let index = 0; index < groupSize; index += 1) {
        fish.push({
          size: 55 + random() * 80,
          group,
          position: formation[index],
          phase: random() * Math.PI * 2,
        })
      }
      remaining -= groupSize
    }
    groups.forEach((group, index) => {
      group.y = 0.1 + (index + random() * 0.5) / groups.length * 0.8
    })

    const paint = (delta = 0) => {
      context.clearRect(0, 0, width, height)
      context.save()
      if (bottomClip) context.clip(bottomClip)
      const scale = Math.max(0.45, Math.min(1, width / 1000))
      groups.forEach((item) => {
        if (delta) {
          item.x += Math.cos(item.heading) * item.speed * scale * delta / swimmingArea.width
          item.y += Math.sin(item.heading) * item.speed * scale * delta / swimmingArea.height

          // Wrap only after the entire school has cleared the edge.
          const marginX = 200 * scale / swimmingArea.width
          const marginY = 200 * scale / swimmingArea.height
          if (item.x < -marginX) item.x += 1 + 2 * marginX
          if (item.x > 1 + marginX) item.x -= 1 + 2 * marginX
          if (item.y < -marginY) item.y += 1 + 2 * marginY
          if (item.y > 1 + marginY) item.y -= 1 + 2 * marginY
        }
      })
      fish.forEach((item) => {
        const group = groups[item.group]
        const along = (item.position[0] + Math.sin(elapsed * 0.7 + item.phase) * 8) * scale
        const across = (item.position[1] + Math.sin(elapsed * 0.5 + item.phase) * 6) * scale
        const cos = Math.cos(group.heading)
        const sin = Math.sin(group.heading)
        context.save()
        context.translate(swimmingArea.x + group.x * swimmingArea.width + along * cos - across * sin, swimmingArea.y + group.y * swimmingArea.height + along * sin + across * cos)
        context.rotate(group.heading)
        context.scale(item.size * scale * 0.7 / 195, item.size * scale / 195)
        context.fillStyle = darkColor
        drawShadow(context, elapsed * 4.6 + item.phase)
        context.restore()
      })
      context.restore()
    }
    const tick = (timestamp) => {
      frame = 0
      if (!visible || reducedMotion.matches || document.hidden) return
      const delta = previous ? Math.min((timestamp - previous) / 1000, 0.05) : 0
      previous = timestamp
      elapsed += delta
      paint(delta)
      frame = window.requestAnimationFrame(tick)
    }
    const syncAnimation = () => {
      window.cancelAnimationFrame(frame)
      frame = 0
      previous = 0
      paint()
      if (visible && !reducedMotion.matches && !document.hidden) frame = window.requestAnimationFrame(tick)
    }
    const resize = () => {
      width = section.clientWidth
      const sectionHeight = section.clientHeight
      height = sectionHeight + verticalBleed * 2
      swimmingArea = { x: 0, y: verticalBleed, width, height: sectionHeight }
      if (area) {
        const sectionBounds = section.getBoundingClientRect()
        const bounds = area.getBoundingClientRect()
        const padding = Math.min(60, width * 0.06)
        const x = Math.max(0, bounds.left - sectionBounds.left - padding)
        const y = Math.max(0, bounds.top - sectionBounds.top - padding)
        swimmingArea = {
          x,
          y: y + verticalBleed,
          width: Math.max(1, Math.min(width, bounds.right - sectionBounds.left + padding) - x),
          height: Math.max(1, Math.min(sectionHeight, bounds.bottom - sectionBounds.top + padding) - y),
        }
      }
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      if (boundaryPath) {
        const matrix = boundaryPath.getScreenCTM()
        if (matrix) {
          const canvasBounds = canvas.getBoundingClientRect()
          const length = boundaryPath.getTotalLength()
          bottomClip = new Path2D()
          bottomClip.moveTo(0, 0)
          for (let index = 0; index <= 384; index += 1) {
            const point = boundaryPath.getPointAtLength(length * index / 384)
            const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(matrix)
            bottomClip.lineTo(screenPoint.x - canvasBounds.left, screenPoint.y - canvasBounds.top)
          }
          bottomClip.lineTo(width, 0)
          bottomClip.closePath()
        }
      }
      paint()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(section)
    if (area) {
      resizeObserver.observe(area)
      resizeObserver.observe(area.parentElement)
    }
    if (bottomBoundary) {
      resizeObserver.observe(bottomBoundary)
      resizeObserver.observe(bottomBoundary.parentElement)
    }
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      syncAnimation()
    })
    intersectionObserver.observe(section)
    reducedMotion.addEventListener('change', syncAnimation)
    document.addEventListener('visibilitychange', syncAnimation)
    resize()

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      reducedMotion.removeEventListener('change', syncAnimation)
      document.removeEventListener('visibilitychange', syncAnimation)
    }
  }, [seed, areaSelector, bottomBoundarySelector])

  return <canvas ref={canvasRef} className="fish-shadows" aria-hidden="true" />
}
