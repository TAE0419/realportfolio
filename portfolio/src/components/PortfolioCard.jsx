import { useId, useLayoutEffect, useRef, useState } from 'react'
import SparkleShape from './SparkleShape'
import { projectCardImage } from '../data/projectAssets'
import styles from './PortfolioCard.module.scss'

export default function PortfolioCard({ project, index, visible }) {
  const [failedImage, setFailedImage] = useState(null)
  const [flipped, setFlipped] = useState(false)
  const patternId = useId()
  const details = project.pages?.project
  const title = details?.title || project.id
  const titleRef = useRef(null)
  const thumbnail = projectCardImage(details?.thumbnail)
  const link = project.pages?.link?.url?.trim()

  useLayoutEffect(() => {
    const heading = titleRef.current
    if (!heading || !flipped) return
    let disposed = false
    const fitTitle = () => {
      if (disposed) return
      heading.classList.remove(styles.compactTitle)
      const lineHeight = parseFloat(getComputedStyle(heading).lineHeight)
      heading.classList.toggle(styles.compactTitle, heading.scrollHeight > lineHeight * 1.5)
    }
    fitTitle()
    const observer = new ResizeObserver(fitTitle)
    observer.observe(heading.closest('figure'))
    document.fonts.ready.then(fitTitle)
    return () => { disposed = true; observer.disconnect() }
  }, [title, flipped])

  return (
    <li className={`${styles.slot} ${visible ? styles.revealing : ''}`} data-project-id={project.id} style={{ '--card-order': index }}>
      <figure
        className={`${styles.card} ${visible ? styles.visible : ''} ${flipped ? styles.flipped : ''}`}
        aria-label={title}
        tabIndex={visible ? 0 : -1}
        onPointerEnter={(event) => { if (event.pointerType !== 'touch') setFlipped(true) }}
        onPointerLeave={(event) => { if (event.pointerType !== 'touch' && !event.currentTarget.contains(document.activeElement)) setFlipped(false) }}
        onFocusCapture={() => setFlipped(true)}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFlipped(false) }}
        onClick={(event) => { if (!event.target.closest('a')) setFlipped(true) }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setFlipped(false)
          if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            setFlipped(value => !value)
          }
        }}
      >
        <div className={styles.flipper}>
          <div className={`${styles.face} ${styles.front}`} aria-hidden={flipped}>
            {thumbnail.src && failedImage !== thumbnail.src
              ? <img src={thumbnail.src} srcSet={thumbnail.srcSet} sizes="(max-width: 480px) 80vw, (max-width: 1100px) 40vw, 22vw" width={480} height={270} alt={title} decoding="async" onError={() => setFailedImage(thumbnail.src)} />
              : <span className={styles.placeholder}>{title}</span>}
          </div>
          <div className={`${styles.face} ${styles.back}`} inert={!flipped} aria-hidden={!flipped}>
            <svg className={styles.pattern} aria-hidden="true">
              <defs>
                <pattern id={patternId} width="64" height="36" patternUnits="userSpaceOnUse">
                  <SparkleShape size={40} x={-2} y={-2} />
                  <SparkleShape size={40} x={30} y={16} />
                  <SparkleShape size={40} x={30} y={-20} />
                  <SparkleShape size={40} x={-34} y={16} />
                  <SparkleShape size={40} x={-34} y={-20} />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${patternId})`} />
            </svg>
            <div className={styles.description}>
              <h3 ref={titleRef}>{title}</h3>
              <p>{details?.summary}</p>
            </div>
            <div className={styles.actions}>
              <a href={`/project/${encodeURIComponent(project.id)}`}>상세보기</a>
              {link && <a href={link}>바로가기</a>}
            </div>
          </div>
        </div>
      </figure>
    </li>
  )
}
