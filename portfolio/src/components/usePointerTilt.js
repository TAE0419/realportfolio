import { useEffect } from 'react'

export default function usePointerTilt(ref, enabled = true, { maxX = 10, maxY = 14 } = {}) {
  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    let frame = 0
    let point = null
    let x = 0
    let y = 0
    const reset = () => {
      cancelAnimationFrame(frame)
      frame = 0
      point = null
      x = y = 0
      element.style.removeProperty('--tilt-x')
      element.style.removeProperty('--tilt-y')
    }
    const animate = () => {
      const bounds = element.getBoundingClientRect()
      const targetX = point ? -Math.max(-1, Math.min(1, (point.y - bounds.top - bounds.height / 2) / Math.max(bounds.height / 2, innerHeight * 0.35))) * maxX : 0
      const targetY = point ? Math.max(-1, Math.min(1, (point.x - bounds.left - bounds.width / 2) / Math.max(bounds.width / 2, innerWidth * 0.35))) * maxY : 0
      x += (targetX - x) * 0.12
      y += (targetY - y) * 0.12
      element.style.setProperty('--tilt-x', `${x}deg`)
      element.style.setProperty('--tilt-y', `${y}deg`)
      frame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.01 ? requestAnimationFrame(animate) : 0
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(animate) }
    const move = (event) => {
      if (!visible || !pointer.matches || reducedMotion.matches || event.pointerType !== 'mouse' || document.documentElement.hasAttribute('data-initial-loading')) return
      point = { x: event.clientX, y: event.clientY }
      schedule()
    }
    const leave = () => { point = null; if (visible) schedule() }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (!visible) reset()
    })
    observer.observe(element)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('scroll', leave, { passive: true })
    window.addEventListener('blur', leave)
    document.documentElement.addEventListener('pointerleave', leave)
    pointer.addEventListener('change', reset)
    reducedMotion.addEventListener('change', reset)
    return () => {
      reset()
      observer.disconnect()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('scroll', leave)
      window.removeEventListener('blur', leave)
      document.documentElement.removeEventListener('pointerleave', leave)
      pointer.removeEventListener('change', reset)
      reducedMotion.removeEventListener('change', reset)
    }
  }, [ref, enabled, maxX, maxY])
}
