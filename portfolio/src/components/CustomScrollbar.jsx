import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import styles from './CustomScrollbar.module.scss'

function ScrollRail({ target = null }) {
  const id = useId()
  const railRef = useRef(null)
  const thumbRef = useRef(null)
  const metricsRef = useRef(null)
  const dragRef = useRef(null)
  const scroll = (top) => {
    if (target) target.scrollTo({ top, behavior: 'instant' })
    else window.scrollTo({ top, behavior: 'instant' })
  }

  useLayoutEffect(() => {
    const rail = railRef.current
    const scroller = target || document.scrollingElement
    const content = document.querySelector('[data-site-content]')
    const clip = target?.closest('[data-scroll-clip]')
    const originalId = scroller.id
    if (!originalId) scroller.setAttribute('id', `scroll-region-${id}`)
    rail.setAttribute('aria-controls', scroller.id)
    let frame = 0
    const measure = () => {
      frame = 0
      const viewport = target ? target.clientHeight : window.innerHeight
      const maximum = Math.max(0, scroller.scrollHeight - viewport)
      const bounds = target?.getBoundingClientRect()
      const clipped = clip && bounds.right > clip.getBoundingClientRect().right - 2
      const targetStyle = target ? getComputedStyle(target) : null
      const unavailable = target && (!target.getClientRects().length || targetStyle.visibility === 'hidden' || target.closest('[inert]') || !/auto|scroll/.test(targetStyle.overflowY))
      const hidden = maximum <= 1 || unavailable || clipped || document.documentElement.hasAttribute('data-initial-loading')
      rail.hidden = Boolean(hidden)
      if (hidden) return
      const top = target ? Math.max(0, bounds.top) + 4 : 6
      const bottom = target ? Math.min(innerHeight, bounds.bottom) - 4 : innerHeight - 6
      const height = Math.max(0, bottom - top)
      if (height < 48) { rail.hidden = true; return }
      const thumbHeight = Math.min(height, Math.max(36, height * viewport / scroller.scrollHeight))
      const travel = height - thumbHeight
      const current = target ? target.scrollTop : window.scrollY
      const ratio = Math.max(0, Math.min(1, current / maximum))
      metricsRef.current = { top, height, thumbHeight, travel, maximum, viewport }
      rail.style.top = `${top}px`
      rail.style.height = `${height}px`
      rail.style.right = `${target ? Math.max(2, innerWidth - bounds.right + 2) : 2}px`
      thumbRef.current.style.height = `${thumbHeight}px`
      thumbRef.current.style.transform = `translateY(${ratio * travel}px)`
      rail.setAttribute('aria-valuenow', String(Math.round(ratio * 100)))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    const resize = new ResizeObserver(schedule)
    new Set([document.documentElement, document.body, scroller, clip].filter(Boolean)).forEach(element => resize.observe(element))
    const mutations = new MutationObserver(schedule)
    if (content) mutations.observe(content, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'inert', 'aria-hidden'] })
    const wheel = (event) => {
      if (!target || event.ctrlKey || !event.deltaY) return
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? target.clientHeight : 1
      target.scrollTo({ top: target.scrollTop + event.deltaY * unit, behavior: 'instant' })
    }
    rail.addEventListener('wheel', wheel, { passive: false })
    document.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    measure()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      rail.removeEventListener('wheel', wheel)
      document.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      if (!originalId) scroller.removeAttribute('id')
    }
  }, [target, id])

  const onPointerDown = (event) => {
    if (event.button !== 0 || !metricsRef.current) return
    event.preventDefault()
    const rail = railRef.current
    const metrics = metricsRef.current
    if (!thumbRef.current.contains(event.target)) {
      scroll((event.clientY - metrics.top - metrics.thumbHeight / 2) / metrics.travel * metrics.maximum)
    }
    dragRef.current = { y: event.clientY, top: target ? target.scrollTop : window.scrollY }
    rail.dataset.dragging = 'true'
    rail.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event) => {
    if (!dragRef.current) return
    const metrics = metricsRef.current
    scroll(dragRef.current.top + (event.clientY - dragRef.current.y) / metrics.travel * metrics.maximum)
  }
  const endDrag = (event) => {
    dragRef.current = null
    delete railRef.current.dataset.dragging
    if (railRef.current.hasPointerCapture(event.pointerId)) railRef.current.releasePointerCapture(event.pointerId)
  }
  const onKeyDown = (event) => {
    const metrics = metricsRef.current
    if (!metrics) return
    const top = target ? target.scrollTop : window.scrollY
    const destinations = { ArrowUp: top - 40, ArrowDown: top + 40, PageUp: top - metrics.viewport * 0.9, PageDown: top + metrics.viewport * 0.9, Home: 0, End: metrics.maximum }
    if (!(event.key in destinations)) return
    event.preventDefault()
    scroll(destinations[event.key])
  }

  return (
    <div ref={railRef} className={styles.rail} hidden tabIndex={0} role="scrollbar" aria-orientation="vertical"
      aria-label={target?.dataset.scrollRegion || '페이지 스크롤'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}
      data-custom-scrollbar={target ? 'region' : 'page'}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
      onLostPointerCapture={() => { dragRef.current = null; if (railRef.current) delete railRef.current.dataset.dragging }} onKeyDown={onKeyDown}>
      <span ref={thumbRef} className={styles.thumb} />
    </div>
  )
}

export default function CustomScrollbar() {
  const [regions, setRegions] = useState([])
  useEffect(() => {
    const content = document.querySelector('[data-site-content]')
    const discover = () => {
      const next = [...document.querySelectorAll('[data-scroll-region]')]
      setRegions(previous => previous.length === next.length && previous.every((element, index) => element === next[index]) ? previous : next)
    }
    discover()
    const observer = new MutationObserver(discover)
    if (content) observer.observe(content, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return <><ScrollRail />{regions.map((target, index) => <ScrollRail key={index} target={target} />)}</>
}
