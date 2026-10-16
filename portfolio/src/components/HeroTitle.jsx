import { useLayoutEffect, useRef } from 'react'
import usePointerTilt from './usePointerTilt'
import styles from './HeroTitle.module.scss'

export default function HeroTitle() {
  const ref = useRef(null)
  usePointerTilt(ref, true, { maxX: 10, maxY: 14 })

  useLayoutEffect(() => {
    let disposed = false
    const fitTitle = () => {
      if (disposed) return
      const stage = ref.current
      stage.style.setProperty('--hero-title-fit', '1')
      const available = document.documentElement.clientWidth - 32
      stage.style.setProperty('--hero-title-fit', Math.min(1, available / stage.querySelector('h1').offsetWidth))
    }
    fitTitle()
    document.fonts.ready.then(fitTitle)
    window.addEventListener('resize', fitTitle)
    return () => { disposed = true; window.removeEventListener('resize', fitTitle) }
  }, [])

  return (
    <div ref={ref} className={styles.stage} data-hero-parallax="true">
      <div className={styles.scene}>
        <h1 id="main-title" className="hero-title">
          <span>KIM</span>
          <span>TAE EUN</span>
        </h1>
        <div className={styles.shadow} aria-hidden="true" data-hero-shadow="true">
          <span>KIM</span>
          <span>TAE EUN</span>
        </div>
      </div>
    </div>
  )
}
