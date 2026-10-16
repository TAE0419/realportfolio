import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import usePointerTilt from './usePointerTilt'
import SparkleShape from './SparkleShape'
import { projectCardImage } from '../data/projectAssets'
import styles from './PortfolioBanner.module.scss'

export default function PortfolioBanner({ project: selectedProject, mirrored = false }) {
  const [project, setProject] = useState(selectedProject)
  const [incomingProject, setIncomingProject] = useState(null)
  const fading = selectedProject !== project
  const bannerRef = useRef(null)
  const titleRef = useRef(null)
  const incoming = incomingProject === selectedProject ? incomingProject : null
  const activeProject = incoming || project
  const details = activeProject?.pages?.project
  const image = projectCardImage(project?.pages?.project?.thumbnail)
  const incomingImage = projectCardImage(incoming?.pages?.project?.thumbnail)
  const hasProject = Boolean(project)

  usePointerTilt(bannerRef, hasProject)

  useEffect(() => {
    if (selectedProject === project) return
    let cancelled = false
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const nextImage = projectCardImage(selectedProject?.pages?.project?.thumbnail)
    const preload = new Image()
    preload.sizes = '56vw'
    if (nextImage.srcSet) preload.srcset = nextImage.srcSet
    if (nextImage.src) preload.src = nextImage.src
    const ready = nextImage.src ? preload.decode().catch(() => {}) : Promise.resolve()
    ready.then(() => {
      if (cancelled) return
      if (reducedMotion || !nextImage.src) {
        setProject(selectedProject)
        setIncomingProject(null)
      } else {
        setIncomingProject(selectedProject)
      }
    })
    return () => { cancelled = true }
  }, [selectedProject, project])

  useLayoutEffect(() => {
    if (!bannerRef.current) return
    let disposed = false
    const syncLayout = () => {
      if (disposed) return
      const banner = bannerRef.current
      const title = titleRef.current
      const hero = document.querySelector('.hero-title')
      const sparkle = document.querySelector('.hero-section .sparkle-mark__icon')
      if (!hero || !sparkle) return
      const scene = banner.firstElementChild
      scene.style.transform = 'none'
      banner.style.setProperty('--title-fit', '1')
      const range = document.createRange()
      range.selectNodeContents(title)
      const titleWidth = range.getBoundingClientRect().width
      banner.style.setProperty('--title-fit', Math.min(1, title.clientWidth / (titleWidth || 1)))
      const heroStyle = getComputedStyle(hero)
      const offsets = heroStyle.textShadow.replace(/rgba?\([^)]*\)/g, '').trim().split(/\s+/).map(parseFloat)
      const referenceSize = parseFloat(heroStyle.fontSize)
      const setShadow = (name, size) => {
        banner.style.setProperty(`--${name}-shadow-x`, `${offsets[0] * size / referenceSize}px`)
        banner.style.setProperty(`--${name}-shadow-y`, `${offsets[1] * size / referenceSize}px`)
      }
      setShadow('title', parseFloat(getComputedStyle(title).fontSize))
      const referenceStyle = getComputedStyle(sparkle)
      const shadowX = parseFloat(referenceStyle.getPropertyValue('--hard-shadow-x'))
      const shadowY = parseFloat(referenceStyle.getPropertyValue('--hard-shadow-y'))
      banner.style.setProperty('--detail-shadow-x', `${shadowX * 1.3}px`)
      banner.style.setProperty('--detail-shadow-y', `${shadowY * 1.7}px`)
      scene.style.removeProperty('transform')
    }
    syncLayout()
    let previousWidth = -1
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === previousWidth) return
      previousWidth = entry.contentRect.width
      syncLayout()
    })
    observer.observe(bannerRef.current)
    window.addEventListener('resize', syncLayout)
    document.fonts.ready.then(syncLayout)
    return () => { disposed = true; observer.disconnect(); window.removeEventListener('resize', syncLayout) }
  }, [activeProject])

  if (!project) return null
  const href = `/project/${encodeURIComponent(activeProject.id)}`
  return (
    <article ref={bannerRef} className={`${styles.banner} ${mirrored ? styles.mirrored : ''}`} data-portfolio-banner={activeProject.id} aria-busy={fading}>
      <div className={styles.scene}>
      <a className={styles.image} href={href} aria-label={`${details.title} 상세보기`}>
        <img src={image.src} srcSet={image.srcSet} sizes="56vw" width={1920} height={1080}
          alt={details.title} loading="lazy" decoding="async" />
        {incoming && <img key={incoming.id} className={styles.incoming} src={incomingImage.src} srcSet={incomingImage.srcSet}
          sizes="56vw" width={1920} height={1080} alt="" aria-hidden="true" decoding="async"
          onAnimationEnd={() => {
            setProject(incoming)
            setIncomingProject(null)
          }} />}
      </a>
      <a className={styles.detail} href={href} aria-label={`${details.title} 상세보기`}>
        <SparkleShape size={176} />
        <span>CLICK</span>
      </a>
      <div className={styles.sparkleShadowMask} aria-hidden="true" data-banner-sparkle-mask="true">
        <div className={`${styles.detail} ${styles.detailShadow}`} data-banner-sparkle-shadow="true">
          <SparkleShape size={176} />
        </div>
      </div>
      <div className={styles.caption}>
        <h3 ref={titleRef} className={styles.title}><a href={href}>{details.title}</a></h3>
        <span className={`${styles.title} ${styles.titleShadow}`} aria-hidden="true" data-banner-title-shadow="true">{details.title}</span>
        {details.summary && <p className={styles.summary}>{details.summary}</p>}
      </div>
      </div>
    </article>
  )
}
