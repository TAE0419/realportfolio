import { useEffect, useRef } from 'react'

const bodyPoints = [-1, 1].flatMap((side) => Array.from({ length: 65 }, (_, step) => {
  const t = side === -1 ? step / 64 : 1 - step / 64
  const x = 80 - t * 155
  const weight = (80 - x) / 195
  return {
    x,
    y: side * Math.sin(Math.PI * t) ** 0.6 * (22 - t * 16),
    sin: Math.sin(weight * 2.2) * 14 * weight ** 2,
    cos: Math.cos(weight * 2.2) * 14 * weight ** 2,
  }
}))

function drawShadow(context, phase) {
  const sin = Math.sin(phase)
  const cos = Math.cos(phase)
  const bend = (x, y) => {
    const tailWeight = (80 - x) / 195
    return [x, y + Math.sin(phase - tailWeight * 2.2) * 14 * tailWeight ** 2]
  }

  // The head stays steady while a travelling curve bends the narrowing body.
  context.beginPath()
  bodyPoints.forEach((point, index) => {
    const y = point.y + sin * point.cos - cos * point.sin
    if (index === 0) context.moveTo(point.x, y)
    else context.lineTo(point.x, y)
  })
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

export default function FishShadows({ seed = 1, areaSelector, bottomBoundarySelector, schoolCount = Infinity }) {
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
    const boundaryLength = boundaryPath?.getTotalLength()
    const boundaryPoints = boundaryPath ? Array.from({ length: 385 }, (_, index) => boundaryPath.getPointAtLength(boundaryLength * index / 384)) : []
    let bottomClip = null
    let clipOffset = 0
    let clipGeometry = ''
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const darkColor = window.getComputedStyle(canvas).getPropertyValue('--dark-color').trim()
    const bubbleColor = window.getComputedStyle(canvas).getPropertyValue('--white-color').trim()
    const bubbles = []
    const maxBubbles = 280
    let width = 0
    let height = 0
    let canvasTop = 0
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
    while (remaining > 0 && groups.length < schoolCount) {
      let groupSize = groups.length === 0 ? 4 : Math.min(remaining, 2 + Math.floor(random() * 2))
      if (schoolCount === 1) groupSize = 2 + Math.floor(random() * 3)
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
          bubbleDelay: 0.22 + random() * 0.38,
        })
      }
      remaining -= groupSize
    }
    groups.forEach((group, index) => {
      group.y = 0.1 + (index + random() * 0.5) / groups.length * 0.8
    })

    const paint = (delta = 0) => {
      const top = Math.max(0, window.scrollY - canvasTop - 100)
      const visibleHeight = Math.max(0, Math.min(height - top, window.innerHeight + 200))
      // The preview canvas is several screens tall; only repaint the visible strip.
      context.clearRect(0, top, width, visibleHeight)
      context.save()
      context.beginPath()
      context.rect(0, top, width, visibleHeight)
      context.clip()
      if (bottomClip) {
        context.translate(0, clipOffset)
        context.clip(bottomClip)
        context.translate(0, -clipOffset)
      }
      const scale = Math.max(0.45, Math.min(1, width / 1000))
      for (let index = bubbles.length - 1; index >= 0; index -= 1) {
        const bubble = bubbles[index]
        bubble.age += delta
        if (bubble.age >= bubble.lifetime) {
          bubbles.splice(index, 1)
          continue
        }
        bubble.y -= bubble.rise * delta
        bubble.x += bubble.drift * delta
        if (bubble.y < top - 8 || bubble.y > top + visibleHeight + 8) continue
        const progress = bubble.age / bubble.lifetime
        context.globalAlpha = 0.8 * (1 - progress) ** 1.5
        context.strokeStyle = bubbleColor
        context.lineWidth = Math.max(0.4, scale * 0.65)
        context.beginPath()
        context.arc(bubble.x, bubble.y, bubble.radius * (1 + progress * 0.25), 0, Math.PI * 2)
        context.stroke()
      }
      context.globalAlpha = 1
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
        const x = swimmingArea.x + group.x * swimmingArea.width + along * cos - across * sin
        const y = swimmingArea.y + group.y * swimmingArea.height + along * sin + across * cos
        if (x < -item.size || x > width + item.size || y < top - item.size || y > top + visibleHeight + item.size) return
        if (delta) {
          item.bubbleDelay -= delta
          if (item.bubbleDelay <= 0) {
            item.bubbleDelay = 0.32 + random() * 0.42
            if (bubbles.length < maxBubbles) {
              const tail = item.size * scale * 0.3
              const spreadAngle = random() * Math.PI * 2
              const spreadRadius = Math.sqrt(random()) * item.size * scale * 0.28
              const spreadAlong = Math.cos(spreadAngle) * spreadRadius * 0.7
              const spreadAcross = Math.sin(spreadAngle) * spreadRadius
              bubbles.push({
                x: x - cos * tail + spreadAlong * cos - spreadAcross * sin,
                y: y - sin * tail + spreadAlong * sin + spreadAcross * cos,
                radius: (0.55 + random() ** 1.5 * 1.85) * scale,
                rise: (20 + random() * 16) * scale,
                drift: (random() - 0.5) * 10 * scale,
                age: 0,
                lifetime: 3.4 + random() * 1.6,
              })
            }
          }
        }
        context.save()
        context.translate(x, y)
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
      if (!visible || reducedMotion.matches || document.hidden || document.documentElement.hasAttribute('data-initial-loading')) return
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
      if (visible && !reducedMotion.matches && !document.hidden && !document.documentElement.hasAttribute('data-initial-loading')) frame = window.requestAnimationFrame(tick)
    }
    const syncBoundary = () => {
      if (boundaryPath) {
        const matrix = boundaryPath.getScreenCTM()
        if (matrix) {
          const canvasBounds = canvas.getBoundingClientRect()
          clipOffset = matrix.f - canvasBounds.top
          const geometry = [width, height, matrix.a, matrix.b, matrix.c, matrix.d, matrix.e - canvasBounds.left].join(',')
          if (geometry !== clipGeometry) {
            clipGeometry = geometry
            bottomClip = new Path2D()
            bottomClip.moveTo(0, -height * 2)
            boundaryPoints.forEach((point) => {
              bottomClip.lineTo(matrix.a * point.x + matrix.c * point.y + matrix.e - canvasBounds.left, matrix.b * point.x + matrix.d * point.y)
            })
            bottomClip.lineTo(width, -height * 2)
            bottomClip.closePath()
          }
        }
      }
    }
    const resize = () => {
      width = section.clientWidth
      canvasTop = canvas.getBoundingClientRect().top + window.scrollY
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
      const pixelWidth = Math.round(width * ratio)
      const pixelHeight = Math.round(height * ratio)
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      syncBoundary()
      paint()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(section)
    if (area) {
      resizeObserver.observe(area)
      resizeObserver.observe(area.parentElement)
    }
    // Opening the wave only changes its clipping boundary, not the canvas layout.
    const boundaryObserver = new ResizeObserver(() => {
      syncBoundary()
      if (!frame) paint()
    })
    if (bottomBoundary) boundaryObserver.observe(bottomBoundary.parentElement)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      syncAnimation()
    })
    intersectionObserver.observe(section)
    reducedMotion.addEventListener('change', syncAnimation)
    document.addEventListener('visibilitychange', syncAnimation)
    window.addEventListener('portfolio-ready', syncAnimation)
    section.addEventListener('portfolio-about-layout', resize)
    resize()

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      boundaryObserver.disconnect()
      intersectionObserver.disconnect()
      reducedMotion.removeEventListener('change', syncAnimation)
      document.removeEventListener('visibilitychange', syncAnimation)
      window.removeEventListener('portfolio-ready', syncAnimation)
      section.removeEventListener('portfolio-about-layout', resize)
    }
  }, [seed, areaSelector, bottomBoundarySelector, schoolCount])

  return <canvas ref={canvasRef} className="fish-shadows" aria-hidden="true" />
}
