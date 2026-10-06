import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import SparkleShape from './components/SparkleShape'
import About from './components/About'
import FishShadows from './components/FishShadows'
import './App.scss'

const waveRows = Array.from({ length: 5 }, (_, index) => index)
const previewTiles = Array.from({ length: 12 }, (_, index) => index)
const wavePath =
  'M-96 18 C-48 44 -16 44 32 18 S112 -8 160 18 240 44 288 18 368 -8 416 18 496 44 544 18 624 -8 672 18 752 44 800 18 880 -8 928 18 1008 44 1056 18 1136 -8 1184 18 1264 44 1312 18 1392 -8 1440 18 1520 44 1568 18 1648 -8 1696 18 1776 44 1824 18 1904 -8 1952 18 2032 44 2080 18'

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
  const holesRef = useRef(null)

  useLayoutEffect(() => {
    const fill = fillRef.current
    const space = fill.parentElement
    const updateClips = () => {
      const height = space.getBoundingClientRect().height
      const waveHeight = space.querySelector('.about-space__top-wave').getBoundingClientRect().height
      const scaleY = waveHeight / 64

      // Keep the wave amplitude fixed while the distance between boundaries grows.
      fill.setAttribute('viewBox', `0 0 1920 ${height}`)
      topClipRef.current.setAttribute('d', `${wavePath} L2080 ${height / scaleY} L-96 ${height / scaleY} Z`)
      topClipRef.current.setAttribute('transform', `translate(0 ${12 * scaleY}) scale(1 ${scaleY})`)
      bottomClipRef.current.setAttribute('d', `${wavePath} L2080 ${-height / scaleY} L-96 ${-height / scaleY} Z`)
      bottomClipRef.current.setAttribute('transform', `translate(0 ${height - waveHeight + 12 * scaleY}) scale(1 ${scaleY})`)

      const fillMatrix = fill.getScreenCTM()?.inverse()
      if (!fillMatrix) {
        return
      }

      const toFillPoint = (x, y) => {
        const point = fill.createSVGPoint()
        point.x = x
        point.y = y
        return point.matrixTransform(fillMatrix)
      }

      const holes = [...space.querySelectorAll('.about-content__donut')].map((donut) => {
        const bounds = donut.getBoundingClientRect()
        const center = toFillPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        )
        const horizontalEdge = toFillPoint(
          bounds.left + bounds.width * 0.94,
          bounds.top + bounds.height / 2,
        )
        const verticalEdge = toFillPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height * 0.94,
        )
        const hole = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
        hole.setAttribute('cx', String(center.x))
        hole.setAttribute('cy', String(center.y))
        hole.setAttribute('rx', String(Math.abs(horizontalEdge.x - center.x)))
        hole.setAttribute('ry', String(Math.abs(verticalEdge.y - center.y)))
        return hole
      })
      holesRef.current.replaceChildren(...holes)
    }

    updateClips()
    const observer = new ResizeObserver(updateClips)
    observer.observe(space)
    observer.observe(space.querySelector('.about-space__top-wave'))
    space.querySelectorAll('.about-content__donut, .about-content').forEach((element) => observer.observe(element))
    window.addEventListener('resize', updateClips)
    space.addEventListener('transitionend', updateClips)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateClips)
      space.removeEventListener('transitionend', updateClips)
    }
  }, [])

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
      </defs>
      <g clipPath={`url(#${id}-top)`}>
        <g clipPath={`url(#${id}-bottom)`}>
          <rect width="100%" height="100%" fill="currentColor" mask={`url(#${id}-skills)`} />
        </g>
      </g>
    </svg>
  )
}

function SparkleMark({ className, label }) {
  return (
    <span className={`sparkle-mark ${className}`}>
      <SparkleShape className="sparkle-mark__icon" size={32} />
      {label && <span>{label}</span>}
    </span>
  )
}

function App() {
  const heroRef = useRef(null)
  const waveFieldRef = useRef(null)
  const aboutRef = useRef(null)

  useEffect(() => {
    const aboutSection = aboutRef.current
    const aboutSpace = aboutSection?.querySelector('.about-space')
    let revealTimer = 0

    const syncAboutSpaceHeight = () => {
      if (!aboutSection) {
        return
      }

      aboutSection.style.setProperty(
        '--about-space-open-height',
        `${aboutSection.getBoundingClientRect().height}px`,
      )
    }

    const revealAboutContent = (event) => {
      if (
        event.target === aboutSpace &&
        event.propertyName === 'height' &&
        aboutSection.classList.contains('is-open')
      ) {
        aboutSection.classList.add('is-content-visible')
      }
    }

    const updateWaveState = () => {
      if (!heroRef.current || !waveFieldRef.current || !aboutRef.current) {
        return
      }

      const waveHeight = waveFieldRef.current.offsetHeight
      const fixedTop = (window.innerHeight - waveHeight) / 2
      const isMobile = window.matchMedia('(max-width: 900px)').matches
      const stoppedBottom = isMobile ? 124 : 140
      const heroBottom =
        heroRef.current.offsetTop + heroRef.current.offsetHeight
      const stopScrollY = heroBottom - stoppedBottom - waveHeight - fixedTop
      const triggerWaveHeight = isMobile ? 42 : 56
      const splitStartScrollY =
        aboutRef.current.offsetTop + triggerWaveHeight / 2 - window.innerHeight / 2

      waveFieldRef.current.classList.toggle(
        'is-stopped',
        window.scrollY >= stopScrollY,
      )
      if (window.scrollY >= splitStartScrollY) {
        syncAboutSpaceHeight()
        aboutRef.current.classList.add('is-open')
        window.clearTimeout(revealTimer)
        revealTimer = window.setTimeout(() => {
          aboutRef.current?.classList.add('is-content-visible')
        }, 550)
      }
    }

    syncAboutSpaceHeight()
    aboutSpace?.addEventListener('transitionend', revealAboutContent)
    updateWaveState()
    window.addEventListener('scroll', updateWaveState, { passive: true })
    window.addEventListener('resize', updateWaveState)

    return () => {
      window.clearTimeout(revealTimer)
      aboutSpace?.removeEventListener('transitionend', revealAboutContent)
      window.removeEventListener('scroll', updateWaveState)
      window.removeEventListener('resize', updateWaveState)
    }
  }, [])

  return (
    <main className="main-page">
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

        <SparkleMark className="sparkle-mark--about" label="ABOUT" />
        <SparkleMark className="sparkle-mark--preview" label="PREVIEW" />
        <SparkleMark className="sparkle-mark--plain-one" />
        <SparkleMark className="sparkle-mark--plain-two" />
        <SparkleMark className="sparkle-mark--frontend" label="FRONTEND" />
        <SparkleMark
          className="sparkle-mark--industrial"
          label="INDUSTRIAL DESIGN"
        />
        <SparkleMark className="sparkle-mark--plain-three" />
        <SparkleMark className="sparkle-mark--plain-four" />
        <SparkleMark className="sparkle-mark--plain-five" />
        <SparkleMark className="sparkle-mark--plain-six" />

        <h1 id="main-title" className="hero-title">
          <span>KIM</span>
          <span>TAE EUN</span>
        </h1>
      </section>

      <section
        className="about-section"
        aria-labelledby="about-title"
        ref={aboutRef}
      >
        <FishShadows seed={31} areaSelector=".about-content__skill-grid" bottomBoundarySelector=".about-space__bottom-wave" />
        <div className="about-space">
          <WaveSpaceFill />
          <WaveRow className="about-space__top-wave" showShadow={false} />
          <h2 id="about-title" className="section-word section-word--about">
            ABOUT
          </h2>
          <About />
          <WaveRow className="about-space__bottom-wave" />
        </div>
      </section>

      <section className="preview-section" aria-labelledby="preview-title">
        <FishShadows seed={53} />
        <div className="preview-heading">
          <h2 id="preview-title" className="section-word">
            PREVIEW
          </h2>
          <p>분야별 대표 작업물을 확인해보세요</p>
        </div>

        <div className="tile-strip" aria-hidden="true">
          {previewTiles.slice(0, 6).map((tile) => (
            <span key={tile} />
          ))}
        </div>

        <div className="preview-card preview-card--first" aria-hidden="true" />

        <div className="tile-strip tile-strip--middle" aria-hidden="true">
          {previewTiles.slice(6).map((tile) => (
            <span key={tile} />
          ))}
        </div>

        <div className="preview-card preview-card--second" aria-hidden="true" />
      </section>
    </main>
  )
}

export default App
