import { useEffect, useRef, useState } from 'react'
import { projectCardImage } from '../data/projectAssets'
import styles from './PortfolioSlide.module.scss'
import { Pause, Play } from 'lucide-react'

export default function PortfolioSlide({ projects, selectedId, onSelect, reverse = false }) {
  const rootRef = useRef(null)
  const [inView, setInView] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const thumbnails = projects.filter(project => projectCardImage(project.pages?.project?.thumbnail).src)
  const items = Array.from({ length: Math.max(1, Math.ceil(8 / Math.max(1, thumbnails.length))) }, () => thumbnails).flat()

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '100px' })
    observer.observe(rootRef.current)
    const updateVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', updateVisibility) }
  }, [])

  return (
    <div ref={rootRef} className={styles.viewport} data-portfolio-slide="true">
      <button className={styles.pause} type="button" onClick={() => setPaused(value => !value)}
        aria-label={paused ? '썸네일 슬라이드 재생' : '썸네일 슬라이드 일시정지'} title={paused ? '재생' : '일시정지'} aria-pressed={paused}>
        {paused ? <Play size={16} /> : <Pause size={16} />}
      </button>
      <div className={`${styles.track} ${reverse ? styles.reverse : ''} ${inView && !paused && !hidden ? styles.running : ''}`}
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
