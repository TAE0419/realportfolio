import { useEffect, useRef } from 'react'
import SparkleShape from './components/SparkleShape'
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

function WaveCapFill({ className = '', side = 'top' }) {
  const fillPath =
    side === 'top'
      ? `${wavePath} L2080 52 L-96 52 Z`
      : `${wavePath} L2080 -12 L-96 -12 Z`

  return (
    <svg
      className={className}
      viewBox="0 -12 1920 64"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={fillPath} fill="currentColor" />
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
        aboutRef.current.classList.add('is-open')
      }
    }

    updateWaveState()
    window.addEventListener('scroll', updateWaveState, { passive: true })
    window.addEventListener('resize', updateWaveState)

    return () => {
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
        <div className="about-space">
          <WaveCapFill className="about-space__mask about-space__mask--top" />
          <WaveCapFill className="about-space__cap about-space__cap--top" />
          <div className="about-space__body" aria-hidden="true" />
          <WaveCapFill
            className="about-space__cap about-space__cap--bottom"
            side="bottom"
          />
          <WaveRow className="about-space__top-wave" showShadow={false} />
          <h2 id="about-title" className="section-word section-word--about">
            ABOUT
          </h2>
          <WaveRow className="about-space__bottom-wave" />
        </div>
      </section>

      <section className="preview-section" aria-labelledby="preview-title">
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
