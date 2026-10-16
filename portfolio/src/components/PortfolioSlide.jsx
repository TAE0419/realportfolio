import { useEffect, useRef, useState } from 'react'
import { projectCardImage } from '../data/projectAssets'
import styles from './PortfolioSlide.module.scss'

export default function PortfolioSlide({ projects, selectedId, onSelect, reverse = false }) {
  const rootRef = useRef(null)
  const [inView, setInView] = useState(false)
  const thumbnails = projects.filter(project => projectCardImage(project.pages?.project?.thumbnail).src)
  const items = Array.from({ length: Math.max(1, Math.ceil(8 / Math.max(1, thumbnails.length))) }, () => thumbnails).flat()

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '100px' })
    observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={rootRef} className={styles.viewport} data-portfolio-slide="true">
      <div className={`${styles.track} ${reverse ? styles.reverse : ''} ${inView ? styles.running : ''}`}
        style={{ '--slide-duration': `${Math.max(18, items.length * 1.8)}s` }}>
        {[0, 1].map(copy => (
          <div key={copy} className={styles.group} aria-hidden={copy === 1 ? true : undefined}>
            {items.map((project, index) => {
              const details = project.pages.project
              const image = projectCardImage(details.thumbnail)
              return (
                <button key={`${project.id}-${index}`} type="button" className={styles.thumbnail}
                  data-preview-project={project.id} aria-label={details.title} aria-pressed={selectedId === project.id}
                  tabIndex={copy === 1 ? -1 : 0} onClick={() => onSelect(project.id)}>
                  <img src={image.src} alt="" width={480} height={270} loading="lazy" decoding="async" />
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
