import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import SparkleMark from './components/SparkleMark'
import Footer from './components/Footer'
import PortfolioSlide from './components/PortfolioSlide'
import PortfolioBanner from './components/PortfolioBanner'
import HeroTitle from './components/HeroTitle'
import frontendData from './data/frontend.json'
import industrialData from './data/industrialDesign.json'
import About from './components/About'
import FishShadows from './components/FishShadows'
import { createWavePath } from './components/waveGeometry'
import styles from './App.module.scss'

const waveRows = Array.from({ length: 5 }, (_, index) => index)
const wavePath = createWavePath()

function WaveRow({ className = '', showShadow = true }) {
  return (
    <svg
      className={`wave-row ${className}`.trim()}
      viewBox="0 -12 1920 64"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {showShadow && (
        <path
          className="wave-row__shadow"
          d={wavePath}
        />
      )}
      <path
        className="wave-row__highlight"
        d={wavePath}
      />
    </svg>
  )
}

function WaveSpaceFill() {
  const id = useId()
  const fillRef = useRef(null)
  const topClipRef = useRef(null)
  const bottomClipRef = useRef(null)
  const contentTopClipRef = useRef(null)
  const contentBottomClipRef = useRef(null)
  const holesRef = useRef(null)

  useLayoutEffect(() => {
    const fill = fillRef.current
    const space = fill.parentElement
    const topWave = space.querySelector('.about-space__top-wave')
    const content = space.querySelector('.about-content')
    const donuts = [...space.querySelectorAll('.about-content__donut')]
    const holes = donuts.map(() => document.createElementNS('http://www.w3.org/2000/svg', 'ellipse'))
    holesRef.current.replaceChildren(...holes)
    let scaleY = topWave.clientHeight / 64
    let previousHeight = -1
    let contentScaleX = 1
    space.style.setProperty('--about-content-top-clip', `url(#${id}-content-top)`)
    space.style.setProperty('--about-content-bottom-clip', `url(#${id}-content-bottom)`)

    const updateClips = (height) => {
      if (height === previousHeight) return
      previousHeight = height

      // Keep the wave amplitude fixed while the distance between boundaries grows.
      bottomClipRef.current.setAttribute('transform', `translate(0 ${height - 52 * scaleY}) scale(1 ${scaleY})`)
      contentBottomClipRef.current.setAttribute('transform', `translate(0 ${height - 52 * scaleY}) scale(${contentScaleX} ${scaleY})`)
    }

    const updateLayout = () => {
      const spaceBounds = space.getBoundingClientRect()
      const bounds = donuts.map((donut) => donut.getBoundingClientRect())
      scaleY = topWave.clientHeight / 64
      const scaleX = 1920 / spaceBounds.width
      contentScaleX = spaceBounds.width / 1920
      const fullHeight = space.parentElement.clientHeight
      fill.setAttribute('viewBox', `0 0 1920 ${fullHeight}`)
      fill.style.height = `${fullHeight}px`
      // Read layout together, then reuse the mask nodes rather than replacing them.
      bounds.forEach((bounds, index) => {
        holes[index].setAttribute('cx', String((bounds.left + bounds.width / 2 - spaceBounds.left) * scaleX))
        holes[index].setAttribute('cy', String(bounds.top + bounds.height / 2 - spaceBounds.top))
        holes[index].setAttribute('rx', String(bounds.width * 0.44 * scaleX))
        holes[index].setAttribute('ry', String(bounds.height * 0.44))
      })
      topClipRef.current.setAttribute('d', `${wavePath} L2080 100000 L-96 100000 Z`)
      bottomClipRef.current.setAttribute('d', `${wavePath} L2080 -100000 L-96 -100000 Z`)
      topClipRef.current.setAttribute('transform', `translate(0 ${12 * scaleY}) scale(1 ${scaleY})`)
      contentTopClipRef.current.setAttribute('d', `${wavePath} L2080 100000 L-96 100000 Z`)
      contentBottomClipRef.current.setAttribute('d', `${wavePath} L2080 -100000 L-96 -100000 Z`)
      contentTopClipRef.current.setAttribute('transform', `translate(0 ${12 * scaleY}) scale(${spaceBounds.width / 1920} ${scaleY})`)
      previousHeight = -1
      updateClips(spaceBounds.height)
    }

    updateLayout()
    const observer = new ResizeObserver(([entry]) => updateClips(entry.contentRect.height))
    observer.observe(space)
    const layoutObserver = new ResizeObserver(updateLayout)
    layoutObserver.observe(content)
    layoutObserver.observe(topWave)
    layoutObserver.observe(space.parentElement)
    donuts.forEach((donut) => layoutObserver.observe(donut))
    window.addEventListener('resize', updateLayout)
    content.addEventListener('portfolio-about-layout', updateLayout)

    return () => {
      observer.disconnect()
      layoutObserver.disconnect()
      window.removeEventListener('resize', updateLayout)
      content.removeEventListener('portfolio-about-layout', updateLayout)
      space.style.removeProperty('--about-content-top-clip')
      space.style.removeProperty('--about-content-bottom-clip')
    }
  }, [id])

  return (
    <svg
      className="about-space__fill"
      ref={fillRef}
      viewBox="0 0 1920 56"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <mask id={`${id}-skills`} maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="100%" style={{ maskType: 'luminance' }}>
          <rect width="100%" height="100%" fill="var(--white-color)" />
          <g
            ref={holesRef}
            className="about-space__holes"
            fill="var(--dark-color)"
          />
        </mask>
        <clipPath id={`${id}-top`} clipPathUnits="userSpaceOnUse">
          <path ref={topClipRef} />
        </clipPath>
        <clipPath id={`${id}-bottom`} clipPathUnits="userSpaceOnUse">
          <path ref={bottomClipRef} />
        </clipPath>
        <clipPath id={`${id}-content-top`} clipPathUnits="userSpaceOnUse">
          <path ref={contentTopClipRef} />
        </clipPath>
        <clipPath id={`${id}-content-bottom`} clipPathUnits="userSpaceOnUse">
          <path ref={contentBottomClipRef} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-top)`}>
        <g clipPath={`url(#${id}-bottom)`}>
          <rect width="100%" height="100%" fill="currentColor" mask={`url(#${id}-skills)`} />
        </g>
      </g>
    </svg>
  )
}

function PortfolioPreview({ projects, label, href, mirrored = false }) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id)
  const selected = projects.find(project => project.id === selectedId) || projects[0]
  return (
    <section className="preview-group" aria-label={label}>
      <SparkleMark className="preview-label" label={label} href={href} />
      <PortfolioSlide projects={projects} selectedId={selected?.id} onSelect={setSelectedId} reverse={mirrored} />
      <PortfolioBanner project={selected} mirrored={mirrored} />
    </section>
  )
}

function App() {
  const heroRef = useRef(null)
  const waveFieldRef = useRef(null)
  const aboutRef = useRef(null)
  const autoScrollingRef = useRef(false)

  useEffect(() => {
    let moving = false
    let scrollFrame = 0
    let touchY = null
    const release = () => {
      moving = false
      autoScrollingRef.current = false
      window.cancelAnimationFrame(scrollFrame)
    }
    const advance = (event, direction) => {
      if (direction <= 0) {
        if (moving) {
          window.scrollTo({ top: window.scrollY, behavior: 'instant' })
          release()
        }
        return
      }
      if (!moving && window.scrollY > 2) return
      event.preventDefault()
      if (moving) return
      const target = aboutRef.current
      if (!target) return
      const startY = window.scrollY
      const targetY = target.getBoundingClientRect().top + startY
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.scrollTo({ top: targetY, behavior: 'instant' })
        window.dispatchEvent(new Event('portfolio-scroll-settled'))
        return
      }
      moving = true
      autoScrollingRef.current = true
      const startTime = performance.now()
      const scroll = (now) => {
        const progress = Math.min((now - startTime) / 1800, 1)
        const eased = progress < 0.5
          ? 4 * progress ** 3
          : 1 - (-2 * progress + 2) ** 3 / 2
        window.scrollTo({ top: startY + (targetY - startY) * eased, behavior: 'instant' })
        if (progress < 1) scrollFrame = window.requestAnimationFrame(scroll)
        else {
          release()
          window.dispatchEvent(new Event('portfolio-scroll-settled'))
        }
      }
      scrollFrame = window.requestAnimationFrame(scroll)
    }
    const onWheel = (event) => {
      if (event.target.closest?.('dialog, [data-scroll-region], [data-custom-scrollbar], textarea, input, select')) return
      if (!event.ctrlKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) advance(event, event.deltaY)
    }
    const onTouchStart = (event) => {
      touchY = event.touches.length === 1 && !event.target.closest('dialog, [data-scroll-region], [data-custom-scrollbar], textarea, input, select') ? event.touches[0].clientY : null
    }
    const onTouchMove = (event) => {
      if (touchY !== null && event.touches.length === 1) {
        const nextY = event.touches[0].clientY
        const direction = touchY - nextY
        if (Math.abs(direction) < 8) return
        touchY = nextY
        advance(event, direction)
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('pointerdown', release)
    window.addEventListener('keydown', release)
    return () => {
      release()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('pointerdown', release)
      window.removeEventListener('keydown', release)
    }
  }, [])

  useEffect(() => {
    const aboutSection = aboutRef.current
    let frame = 0
    let stopScrollY = 0
    let splitStartScrollY = 0
    let revealTimeout = 0

    const revealWhenStopped = () => {
      window.clearTimeout(revealTimeout)
      if (autoScrollingRef.current) return
      if (window.scrollY >= splitStartScrollY) aboutSection.classList.add('is-open')
    }

    const syncAboutSpaceHeight = () => {
      if (!aboutSection) {
        return
      }

      aboutSection.style.setProperty(
        '--about-space-open-height',
        `${aboutSection.getBoundingClientRect().height}px`,
      )
    }

    const updateWaveState = () => {
      frame = 0
      waveFieldRef.current?.classList.toggle('is-stopped', window.scrollY >= stopScrollY)
      window.clearTimeout(revealTimeout)
      if (window.scrollY >= splitStartScrollY && !aboutSection.classList.contains('is-open')) {
        // scrollend handles native scrolling; the timer supports older browsers.
        if (!('onscrollend' in window) && !autoScrollingRef.current) {
          revealTimeout = window.setTimeout(revealWhenStopped, 80)
        }
      }
    }

    const scheduleWaveState = () => {
      if (!frame) frame = window.requestAnimationFrame(updateWaveState)
    }

    const syncLayout = () => {
      if (!heroRef.current || !waveFieldRef.current || !aboutRef.current) {
        return
      }

      const waveHeight = waveFieldRef.current.offsetHeight
      const fixedTop = (window.innerHeight - waveHeight) / 2
      const isMobile = window.matchMedia('(max-width: 900px)').matches
      const stoppedBottom = isMobile ? 124 : 140
      const heroBottom =
        heroRef.current.offsetTop + heroRef.current.offsetHeight
      stopScrollY = heroBottom - stoppedBottom - waveHeight - fixedTop
      const triggerWaveHeight = isMobile ? 42 : 56
      splitStartScrollY =
        aboutRef.current.offsetTop + triggerWaveHeight / 2 - window.innerHeight / 2

      syncAboutSpaceHeight()
      scheduleWaveState()
    }

    syncLayout()
    window.addEventListener('scroll', scheduleWaveState, { passive: true })
    window.addEventListener('scrollend', revealWhenStopped)
    window.addEventListener('portfolio-scroll-settled', revealWhenStopped)
    window.addEventListener('resize', syncLayout)
    const layoutObserver = new ResizeObserver(syncLayout)
    layoutObserver.observe(aboutSection)
    layoutObserver.observe(heroRef.current)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(revealTimeout)
      layoutObserver.disconnect()
      window.removeEventListener('scroll', scheduleWaveState)
      window.removeEventListener('scrollend', revealWhenStopped)
      window.removeEventListener('portfolio-scroll-settled', revealWhenStopped)
      window.removeEventListener('resize', syncLayout)
    }
  }, [])

  return (
    <>
    <main className={styles.page}>
      <section
        className="hero-section"
        aria-labelledby="main-title"
        ref={heroRef}
      >
        <FishShadows seed={17} />
        <div
          className="wave-field"
          aria-hidden="true"
          ref={waveFieldRef}
        >
          {waveRows.map((row) => (
            <WaveRow key={row} />
          ))}
        </div>

        <SparkleMark className="sparkle-mark--about" label="ABOUT" href="#about" />
        <SparkleMark className="sparkle-mark--preview" label="PREVIEW" href="#preview" />
        <SparkleMark className="sparkle-mark--plain-one" />
        <SparkleMark className="sparkle-mark--plain-two" />
        <SparkleMark className="sparkle-mark--frontend" label="FRONTEND" href="/frontend" />
        <SparkleMark
          className="sparkle-mark--industrial"
          label="INDUSTRIAL DESIGN"
          href="/industrial-design"
        />
        <SparkleMark className="sparkle-mark--plain-three" />
        <SparkleMark className="sparkle-mark--plain-four" />
        <SparkleMark className="sparkle-mark--plain-five" />
        <SparkleMark className="sparkle-mark--plain-six" />

        <HeroTitle />
      </section>

      <section
        id="about"
        data-navigation-surface="light"
        className="about-section"
        aria-labelledby="about-title"
        ref={aboutRef}
      >
        <FishShadows seed={31} areaSelector=".about-content__skill-grid" bottomBoundarySelector=".about-space__bottom-wave" />
        <div className="about-space">
          <WaveSpaceFill />
          <WaveRow className="about-space__top-wave" showShadow={false} />
          <div className="about-space__content">
            <div className="about-space__content-inner">
              <h2 id="about-title" className="section-word section-word--about">
                ABOUT
              </h2>
              <About />
            </div>
          </div>
          <WaveRow className="about-space__bottom-wave" />
        </div>
      </section>

      <section id="preview" className="preview-section" aria-labelledby="preview-title">
        <FishShadows seed={53} />
        <div className="preview-heading">
          <h2 id="preview-title" className="section-word">PREVIEW</h2>
          <p>분야별 프로젝트를 클릭하여 상세 내용을 확인해보세요.</p>
        </div>
        <PortfolioPreview projects={frontendData.projects} label="FRONTEND PROJECT" href="/frontend" />
        <PortfolioPreview projects={industrialData.projects} label="INDUSTRIAL DESIGN PROJECT" href="/industrial-design" mirrored />
      </section>
    </main>
    <Footer />
    </>
  )
}

export default App
