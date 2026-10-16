import { useLayoutEffect, useRef } from 'react'
import usePointerTilt from './usePointerTilt'
import SparkleShape from './SparkleShape'
import { projectCardImage } from '../data/projectAssets'
import styles from './PortfolioBanner.module.scss'

export default function PortfolioBanner({ project, mirrored = false }) {
  const bannerRef = useRef(null)
  const titleRef = useRef(null)
  const details = project?.pages?.project
  const image = projectCardImage(details?.thumbnail)
  const hasProject = Boolean(project)

  usePointerTilt(bannerRef, hasProject)

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
  }, [project])

  if (!project) return null
  const href = `/project/${encodeURIComponent(project.id)}`
  return (
    <article ref={bannerRef} className={`${styles.banner} ${mirrored ? styles.mirrored : ''}`} data-portfolio-banner={project.id}>
      <div className={styles.scene}>
      <a className={styles.image} href={href} aria-label={`${details.title} 상세보기`}>
        <img key={image.src} src={image.src} srcSet={image.srcSet} sizes="56vw" width={1920} height={1080}
          alt={details.title} loading="lazy" decoding="async" />
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
