import { useEffect, useId, useLayoutEffect, useState } from 'react'
import { createWavePath } from './waveGeometry'
import { markInitialLoadingComplete, prepareStartupAssets } from '../data/startupAssets'
import styles from './InitialLoader.module.scss'

const wavePath = createWavePath()

export default function InitialLoader({ onComplete }) {
  const gradientId = useId()
  const [progress, setProgress] = useState(0)
  const [opening, setOpening] = useState(false)
  const [viewport, setViewport] = useState(() => ({ height: window.innerHeight, waveHeight: window.innerWidth <= 900 ? 42 : 56 }))

  useLayoutEffect(() => {
    const measure = () => {
      const wave = document.querySelector('.wave-row')
      setViewport({ height: window.innerHeight, waveHeight: wave ? parseFloat(getComputedStyle(wave).height) : window.innerWidth <= 900 ? 42 : 56 })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    let disposed = false
    let frame = 0
    let holdTimer = 0
    let finishTimer = 0
    let target = 0
    let displayed = 0
    let ready = false
    const started = performance.now()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    document.documentElement.setAttribute('data-initial-loading', '')
    const blockScroll = (event) => { event.preventDefault(); event.stopImmediatePropagation() }
    const blockKeys = (event) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) blockScroll(event)
    }
    window.addEventListener('wheel', blockScroll, { passive: false, capture: true })
    window.addEventListener('touchmove', blockScroll, { passive: false, capture: true })
    window.addEventListener('keydown', blockKeys, true)
    const preparation = prepareStartupAssets(value => { target = value * 100 })
    preparation.ready.then(() => { if (!disposed) { ready = true; target = 100 } })
    const finish = () => {
      if (disposed) return
      markInitialLoadingComplete()
      document.documentElement.removeAttribute('data-initial-loading')
      window.dispatchEvent(new Event('portfolio-ready'))
      onComplete()
    }
    const animate = (now) => {
      displayed = reducedMotion.matches ? target : Math.min(target, displayed + Math.max(0.15, (target - displayed) * 0.1))
      if (ready && displayed > 99.7 && now - started >= (reducedMotion.matches ? 0 : 1100)) {
        setProgress(100)
        holdTimer = window.setTimeout(() => {
          setOpening(true)
          finishTimer = window.setTimeout(finish, reducedMotion.matches ? 0 : 1100)
        }, reducedMotion.matches ? 0 : 220)
        return
      }
      setProgress(Math.min(99, Math.floor(displayed)))
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => {
      disposed = true
      preparation.unsubscribe()
      cancelAnimationFrame(frame)
      clearTimeout(holdTimer)
      clearTimeout(finishTimer)
      document.documentElement.removeAttribute('data-initial-loading')
      window.removeEventListener('wheel', blockScroll, true)
      window.removeEventListener('touchmove', blockScroll, true)
      window.removeEventListener('keydown', blockKeys, true)
    }
  }, [onComplete])

  const { height, waveHeight } = viewport
  const scale = waveHeight / 64
  const transform = `translate(0 ${height / 2 - waveHeight / 2 + 12 * scale}) scale(1 ${scale})`
  const gradientStart = progress === 100 ? 1920 : Math.max(0, progress - 28) * 19.2
  const gradientEnd = progress === 100 ? 1921 : Math.max(0.01, progress * 19.2)

  return (
    <div className={`${styles.loader} ${opening ? styles.opening : ''}`} style={{ '--loader-wave-height': `${waveHeight}px` }}
      role="progressbar" aria-label="페이지 로딩" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
      data-initial-loader={opening ? 'opening' : 'loading'}>
      <div className={styles.upper}>
        <svg viewBox={`0 0 1920 ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={`${wavePath} L2080 ${-height * 4} L-96 ${-height * 4} Z`} transform={transform} />
        </svg>
        <p className={styles.label}>Loading...</p>
      </div>
      <div className={styles.lower}>
        <svg viewBox={`0 0 1920 ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={`${wavePath} L2080 ${height * 4} L-96 ${height * 4} Z`} transform={transform} />
        </svg>
        <output className={styles.percent}>{progress}%</output>
      </div>
      <svg className={styles.wave} viewBox="0 -12 1920 64" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={gradientStart} x2={gradientEnd}>
            <stop stopColor="var(--main-color)" />
            <stop offset="1" stopColor="var(--white-color)" />
          </linearGradient>
        </defs>
        <path d={wavePath} stroke={`url(#${gradientId})`} />
      </svg>
    </div>
  )
}
