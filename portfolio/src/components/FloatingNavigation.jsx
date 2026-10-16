import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import SparkleShape from './SparkleShape'
import styles from './FloatingNavigation.module.scss'

const links = [
  ['HOME', '/'],
  ['ABOUT', '/#about'],
  ['PREVIEW', '/#preview'],
  ['FRONTEND', '/frontend'],
  ['INDUSTRIAL DESIGN', '/industrial-design'],
]

export default function FloatingNavigation() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)

  useLayoutEffect(() => {
    const syncShadow = () => {
      const reference = document.querySelector('.sparkle-mark__icon')
      const icon = triggerRef.current?.querySelector('svg')
      if (!reference || !icon) return
      const referenceStyle = getComputedStyle(reference)
      const ratio = parseFloat(getComputedStyle(icon).width) / parseFloat(referenceStyle.width)
      const x = parseFloat(referenceStyle.getPropertyValue('--hard-shadow-x')) * ratio
      const y = parseFloat(referenceStyle.getPropertyValue('--hard-shadow-y')) * ratio
      icon.style.filter = `drop-shadow(${x}px ${y}px 0 var(--dark-color))`
    }
    syncShadow()
    window.addEventListener('resize', syncShadow)
    return () => window.removeEventListener('resize', syncShadow)
  }, [])

  useEffect(() => {
    if (window.location.pathname !== '/') return
    const id = window.location.hash.slice(1)
    const frame = requestAnimationFrame(() => {
      if (id === 'about' || id === 'preview') document.getElementById(id)?.scrollIntoView()
      else window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const navigate = (event, href) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    setOpen(false)
    if (window.location.pathname === '/' && href === '/') {
      event.preventDefault()
      window.history.replaceState(null, '', '/')
      window.scrollTo({ top: 0, left: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
      return
    }
    if (window.location.pathname !== '/' || !href.startsWith('/#')) return
    const section = document.getElementById(href.slice(2))
    if (!section) return
    event.preventDefault()
    window.history.replaceState(null, '', href)
    section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return (
    <nav
      className={`${styles.navigation} ${open ? styles.open : ''}`}
      style={{ '--link-count': links.length }}
      aria-label="페이지 이동"
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setOpen(true) }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setOpen(false) }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}
      onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}
    >
      <a
        ref={triggerRef}
        className={styles.trigger}
        href="/"
        aria-label="페이지 이동 메뉴"
        aria-expanded={open}
        aria-controls="floating-navigation-links"
        onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) setOpen(true) }}
        onClick={(event) => navigate(event, '/')}
      >
        <SparkleShape size={76} innerStroke />
      </a>
      <div id="floating-navigation-links" className={styles.links} inert={!open}>
        {links.map(([label, href], index) => (
          <a key={href} href={href} style={{ '--order': links.length - 1 - index }} onClick={(event) => navigate(event, href)}><span>{label}</span></a>
        ))}
      </div>
    </nav>
  )
}
