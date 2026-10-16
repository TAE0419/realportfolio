import { useLayoutEffect, useRef } from 'react'
import { createWavePath } from './waveGeometry'
import SparkleShape from './SparkleShape'
import styles from './ProjectSidebar.module.scss'

export default function ProjectSidebar({ projectId, pages, activePage, onNavigate, returnPath }) {
  const sidebarRef = useRef(null)
  const waveRef = useRef(null)
  const glowRef = useRef(null)
  const curveRef = useRef(null)
  const glowPositionRef = useRef(null)
  const entries = Object.entries(pages).filter(([, page]) => page.pageName && (page.images || page.title || page.url))

  useLayoutEffect(() => {
    const syncGeometry = () => {
      const sidebar = sidebarRef.current
      const wave = waveRef.current
      const reference = document.createElement('div')
      reference.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden'
      const mainWave = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      mainWave.setAttribute('class', 'wave-row')
      reference.append(mainWave)
      document.body.append(reference)
      const thickness = parseFloat(getComputedStyle(mainWave).height)
      const alongScale = document.documentElement.clientWidth / 1920
      reference.remove()
      const viewportHeight = sidebar.clientHeight
      let height = viewportHeight
      const mobile = window.matchMedia('(max-width: 700px)').matches
      const start = height < 600 ? 48 : mobile ? 80 : 116
      const items = sidebar.querySelectorAll('nav a')
      const inwardY = (limit) => 21 + alongScale * (-32 + Math.floor(((limit - 21) / alongScale + 32) / 256) * 256)
      const extremaBefore = (limit) => {
        const points = []
        for (let index = 0; ; index += 1) {
          const y = 21 + alongScale * (-32 + index * 128)
          if (y >= limit - 32) break
          if (y >= 24) points.push(y)
        }
        return points
      }
      let backY = inwardY(height - 96)
      let extrema = extremaBefore(backY)
      if (extrema.length < items.length) {
        backY = inwardY(height - 24)
        extrema = extremaBefore(backY)
      }
      // Very short viewports retain the wave scale and scroll only the sidebar.
      while (extrema.length < items.length) {
        height += alongScale * 256
        backY = inwardY(height - 24)
        extrema = extremaBefore(backY)
      }
      sidebar.style.overflowY = height > viewportHeight ? 'auto' : 'visible'
      sidebar.style.pointerEvents = height > viewportHeight ? 'auto' : 'none'
      const acrossScale = thickness / 64
      const length = (height + 256) / alongScale
      const curve = createWavePath(length)
      wave.style.width = `${thickness}px`
      wave.style.height = `${height}px`
      wave.setAttribute('viewBox', `0 0 ${thickness} ${height}`)
      wave.querySelectorAll('path').forEach(path => {
        path.setAttribute('d', path.dataset.fill ? `${curve} L ${length + 256} 200 L 0 200 Z` : curve)
        path.setAttribute('transform', `matrix(0 ${alongScale} ${-acrossScale} 0 ${thickness - 12 * acrossScale} 21)`)
      })
      const path = wave.querySelector('path:last-child')
      const matrix = path.getScreenCTM()
      const total = path.getTotalLength()
      const step = Math.min(mobile ? 96 : 136, Math.max(24, (backY - start - 64) / Math.max(1, items.length - 1)))
      // Position labels from the actual curve rather than an approximate slope.
      const pointAtY = (y) => {
        let low = 0
        let high = total
        for (let iteration = 0; iteration < 24; iteration += 1) {
          const middle = (low + high) / 2
          const point = path.getPointAtLength(middle).matrixTransform(matrix)
          if (point.y < y) low = middle
          else high = middle
        }
        return path.getPointAtLength((low + high) / 2).matrixTransform(matrix)
      }
      curveRef.current = pointAtY
      const placeLink = (item, y) => {
        const point = pointAtY(y)
        item.style.left = `${point.x + (mobile ? 14 : 38)}px`
        item.style.top = `${y}px`
      }
      let previous = -1
      items.forEach((item, index) => {
        const last = extrema.length - (items.length - index)
        let closest = previous + 1
        for (let candidate = closest + 1; candidate <= last; candidate += 1) {
          if (Math.abs(extrema[candidate] - (start + index * step)) < Math.abs(extrema[closest] - (start + index * step))) closest = candidate
        }
        previous = closest
        placeLink(item, extrema[closest])
      })
      placeLink(sidebar.querySelector('[data-back]'), backY)
      sidebar.dispatchEvent(new Event('sidebar-geometry'))
    }
    syncGeometry()
    window.addEventListener('resize', syncGeometry)
    return () => window.removeEventListener('resize', syncGeometry)
  }, [pages])

  useLayoutEffect(() => {
    const sidebar = sidebarRef.current
    const glow = glowRef.current
    let frame = 0
    let disposed = false
    const moveGlow = () => {
      if (disposed) return
      cancelAnimationFrame(frame)
      const link = sidebar.querySelector('nav [aria-current="page"]')
      if (!link || !curveRef.current) return
      const y = parseFloat(link.style.top)
      const target = {
        y,
        offset: parseFloat(link.style.left) + link.offsetWidth / 2 - curveRef.current(y).x,
      }
      const draw = (position) => {
        glowPositionRef.current = position
        const x = curveRef.current(position.y).x + position.offset
        glow.style.transform = `translate(${x}px, ${position.y}px) translate(-50%, -50%)`
      }
      const from = glowPositionRef.current
      if (!from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        draw(target)
        return
      }
      const start = performance.now()
      const animate = (now) => {
        const progress = Math.min(1, (now - start) / 650)
        const eased = progress * progress * (3 - 2 * progress)
        draw({ y: from.y + (target.y - from.y) * eased, offset: from.offset + (target.offset - from.offset) * eased })
        if (progress < 1) frame = requestAnimationFrame(animate)
      }
      frame = requestAnimationFrame(animate)
    }
    moveGlow()
    sidebar.addEventListener('sidebar-geometry', moveGlow)
    document.fonts.ready.then(() => { if (sidebar.isConnected) moveGlow() })
    return () => { disposed = true; cancelAnimationFrame(frame); sidebar.removeEventListener('sidebar-geometry', moveGlow) }
  }, [activePage, pages])

  return (
    <aside ref={sidebarRef} className={styles.sidebar} data-scroll-region="프로젝트 사이드바">
      <svg ref={waveRef} className={styles.wave} fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path data-fill="true" className={styles.fill} />
        <path className={styles.line} />
      </svg>
      <div ref={glowRef} className={styles.glow} aria-hidden="true" data-sidebar-glow="true" />
      <SparkleShape className={`sparkle-mark__icon ${styles.measure}`} />
      <nav aria-label="프로젝트 페이지">
        {entries.map(([key, page]) => (
          <a key={key} href={page.url || `/project/${encodeURIComponent(projectId)}/${encodeURIComponent(key)}`}
            data-page-transition={page.url ? undefined : 'local'}
            className={activePage === key ? styles.active : undefined}
            aria-current={activePage === key ? 'page' : undefined}
            onClick={page.url ? undefined : event => onNavigate(event, key)}>{page.pageName}</a>
        ))}
      </nav>
      <a href={returnPath} data-back="true">돌아가기</a>
    </aside>
  )
}
