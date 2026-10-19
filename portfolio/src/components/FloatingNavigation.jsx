import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import chatIcon from '../assets/shapes/image.png'
import SparkleShape from './SparkleShape'
import Chatbot from './Chatbot'
import { chatMotion } from './chatbotLayout'
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
  const [chatStage, setChatStage] = useState('closed')
  const chatOpen = chatStage !== 'closed'
  const chatReady = chatStage === 'open'
  const chatOpening = ['connecting', 'lifting', 'revealing'].includes(chatStage)
  const menuOpen = open && (!chatOpen || chatReady)
  const closeChat = useCallback(() => {
    setChatStage(stage => stage === 'closed' ? stage : window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'closed' : 'concealing')
    setOpen(false)
  }, [])
  const triggerRef = useRef(null)
  const navigationRef = useRef(null)
  const rigRef = useRef(null)

  useEffect(() => {
    const next = chatMotion[chatStage]
    if (!next) return
    const timer = window.setTimeout(() => {
      setChatStage(next[0])
      if (next[0] === 'open') setOpen(false)
    }, next[1])
    return () => clearTimeout(timer)
  }, [chatStage])

  useLayoutEffect(() => {
    const lightSections = [...document.querySelectorAll('[data-navigation-surface="light"]')]
    if (!lightSections.length) return
    const items = [...navigationRef.current.querySelectorAll('#floating-navigation-links > a')]
    let frame = 0
    const updateColors = () => {
      frame = 0
      const bounds = lightSections.map(section => section.getBoundingClientRect())
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      rigRef.current.dataset.chatSurface = bounds.some(area => centerX >= area.left && centerX <= area.right && centerY >= area.top && centerY < area.bottom) ? 'light' : 'dark'
      const surfaces = items.map(item => {
        const rect = item.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2
        return bounds.some(area => x >= area.left && x <= area.right && y >= area.top && y < area.bottom) ? 'light' : 'dark'
      })
      items.forEach((item, index) => { item.dataset.surface = surfaces[index] })
    }
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(updateColors)
    }
    const observer = new ResizeObserver(scheduleUpdate)
    lightSections.forEach(section => observer.observe(section))
    observer.observe(navigationRef.current)
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    updateColors()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [])

  useLayoutEffect(() => {
    const syncShadow = () => {
      const reference = document.querySelector('.sparkle-mark__icon')
      const icon = triggerRef.current?.querySelector('svg')
      if (!icon) return
      const shape = icon.querySelector(':scope > path').getBBox()
      const iconWidth = parseFloat(getComputedStyle(icon).width)
      const inset = (triggerRef.current.clientWidth - iconWidth) / 2 + iconWidth * (1 - (shape.x + shape.width) / icon.viewBox.baseVal.width)
      rigRef.current.style.setProperty('--chat-line-inset', `${inset}px`)
      if (!reference) return
      const referenceStyle = getComputedStyle(reference)
      const ratio = parseFloat(getComputedStyle(icon).width) / parseFloat(referenceStyle.width)
      const x = parseFloat(referenceStyle.getPropertyValue('--hard-shadow-x')) * ratio
      const y = parseFloat(referenceStyle.getPropertyValue('--hard-shadow-y')) * ratio
      icon.style.setProperty('--navigation-shadow', `drop-shadow(${x}px ${y}px 0 var(--dark-color))`)
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
    if (chatOpen) closeChat()
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
    <div ref={rigRef} className={styles.rig} data-chat-stage={chatStage} data-chat-menu-docked={chatOpen}>
    <span className={styles.anchor} data-floating-navigation-anchor="true" aria-hidden="true" />
    <div className={styles.motionViewport}>
    <nav
      ref={navigationRef}
      className={`${styles.navigation} ${menuOpen ? styles.open : ''}`}
      style={{ '--link-count': links.length }}
      aria-label="페이지 이동"
      onPointerEnter={(event) => { if (event.pointerType === 'mouse' && (!chatOpen || chatReady)) setOpen(true) }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse' && !chatOpening) setOpen(false) }}
      onBlur={(event) => { if (!chatOpening && !event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}
      onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}
    >
      <div className={styles.connector} data-chat-connector="true" aria-hidden="true"><span /></div>
      <button
        type="button"
        ref={triggerRef}
        data-floating-navigation-trigger="true"
        className={styles.trigger}
        aria-label={chatOpen ? '포트폴리오 챗봇 닫기' : '포트폴리오 챗봇 열기'}
        aria-expanded={chatOpen}
        aria-controls="portfolio-chatbot"
        aria-haspopup="dialog"
        title={chatOpen ? '챗봇 닫기' : '챗봇'}
        onFocus={(event) => { if ((!chatOpen || chatReady) && event.currentTarget.matches(':focus-visible')) setOpen(true) }}
        onClick={() => {
          setOpen(false)
          if (chatOpen) closeChat()
          else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setChatStage('open'); setOpen(false) }
          else setChatStage('connecting')
        }}
      >
        <SparkleShape size={76} innerStroke className={styles.sparkle} />
        {!chatOpen && <span className={styles.pictogram} style={{ maskImage: `url("${chatIcon}")` }} aria-hidden="true" data-navigation-icon="chat" />}
        {chatOpen && <X size={28} strokeWidth={1.8} className={`${styles.pictogram} ${styles.closePictogram}`} aria-hidden="true" data-navigation-icon="close" />}
      </button>
      <div id="floating-navigation-links" className={styles.links} inert={!menuOpen}>
        {links.map(([label, href], index) => (
          <a key={href} href={href} style={{ '--order': chatOpen ? index : links.length - 1 - index }} onClick={(event) => navigate(event, href)}><span>{label}</span></a>
        ))}
      </div>
    </nav>
    </div>
    <Chatbot open={chatOpen} ready={chatReady} stage={chatStage} onClose={closeChat} />
    </div>
  )
}
