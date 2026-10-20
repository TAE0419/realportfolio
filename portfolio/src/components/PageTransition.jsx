import { useEffect, useLayoutEffect, useState } from 'react'
import styles from './PageTransition.module.scss'
import { settleWithin } from '../data/preparation'

export default function PageTransition() {
  const [covered, setCovered] = useState(true)

  useLayoutEffect(() => {
    // Hand the HTML boot cover to the mounted overlay before the next paint.
    document.documentElement.removeAttribute('data-page-boot')
  }, [])

  useEffect(() => {
    let disposed = false
    let timer = 0
    let frame = 0
    let leaving = false
    let localPage = null
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    settleWithin(document.fonts.ready).then(() => {
      if (disposed) return
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => { if (!leaving) setCovered(false) })
      })
    })

    const navigate = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target.closest('a[href]')
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
      if (link.dataset.pageTransition === 'local') return
      const destination = new URL(link.href)
      const path = destination.pathname.replace(/\/+$/, '')
      const currentPath = window.location.pathname.replace(/\/+$/, '')
      if (destination.origin !== window.location.origin || (path === currentPath && destination.search === window.location.search)) return
      event.preventDefault()
      event.stopPropagation()
      if (leaving) return
      leaving = true
      setCovered(true)
      timer = window.setTimeout(() => {
        window.location.assign(destination.href)
      }, reducedMotion.matches ? 0 : 300)
    }
    const navigateLocally = (event) => {
      event.preventDefault()
      if (leaving) return
      leaving = true
      localPage = event.detail.page
      event.detail.start?.()
      localPage?.setAttribute('data-content-transition', 'covered')
      timer = window.setTimeout(() => {
        event.detail.navigate()
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            if (disposed) return
            leaving = false
            localPage?.removeAttribute('data-content-transition')
            localPage = null
          })
        })
      }, reducedMotion.matches ? 0 : 300)
    }
    const restore = (event) => {
      if (!event.persisted) return
      cancelPending()
    }
    const cancelPending = () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      localPage?.removeAttribute('data-content-transition')
      localPage = null
      leaving = false
      setCovered(false)
    }
    document.addEventListener('click', navigate, true)
    window.addEventListener('portfolio-page-navigate', navigateLocally)
    window.addEventListener('pageshow', restore)
    window.addEventListener('popstate', cancelPending)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      localPage?.removeAttribute('data-content-transition')
      document.removeEventListener('click', navigate, true)
      window.removeEventListener('portfolio-page-navigate', navigateLocally)
      window.removeEventListener('pageshow', restore)
      window.removeEventListener('popstate', cancelPending)
    }
  }, [])

  return <div className={`${styles.overlay} ${covered ? styles.covered : ''}`} aria-hidden="true" />
}
