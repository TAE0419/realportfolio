import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import frontendData from '../data/frontend.json'
import industrialData from '../data/industrialDesign.json'
import { projectImage } from '../data/projectAssets'
import { isProjectVideo, isProjectVideoPage, isProjectPdf } from '../data/projectMedia'
import SparkleShape from '../components/SparkleShape'
import ProjectSidebar from '../components/ProjectSidebar'
import ProjectPdf from '../components/ProjectPdf'
import styles from './projectDetail.module.scss'

function readProjectPage(pages) {
  const key = window.location.pathname.split('/').filter(Boolean)[2] || 'project'
  return pages[key] && !pages[key].url ? key : 'project'
}

function DetailImage({ path, label, first }) {
  const [failedImage, setFailedImage] = useState(null)
  const src = projectImage(path)
  const failed = failedImage === src
  return (
    <figure className={`${styles.image} ${!src || failed ? styles.missingImage : ''}`} aria-label={!src || failed ? `${label}: 이미지 없음` : undefined}>
      {src && !failed && <img src={src} alt={label} loading={first ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedImage(src)} />}
    </figure>
  )
}

function DetailVideo({ path, label }) {
  const [failedVideo, setFailedVideo] = useState(null)
  const src = projectImage(path)
  return (
    <div className={styles.videoFrame}>
      {src && failedVideo !== src
        ? <video className={styles.video} src={src} aria-label={label} controls playsInline preload="metadata"
          onLoadedMetadata={event => {
            const video = event.currentTarget
            video.style.setProperty('--video-ratio', video.videoWidth / video.videoHeight)
            video.muted = false
            video.volume = 1
          }}
          onError={() => setFailedVideo(src)} />
        : <p className={styles.videoError} role="alert">영상을 불러올 수 없습니다.</p>}
    </div>
  )
}

export default function ProjectDetail() {
  const id = window.location.pathname.split('/').filter(Boolean)[1]
  const frontend = frontendData.projects.find(project => project.id === id)
  const project = frontend || industrialData.projects.find(project => project.id === id)
  const titleRef = useRef(null)
  const contentRef = useRef(null)
  const thumbnailsRef = useRef(null)
  const pages = project?.pages || {}
  const [activePage, setActivePage] = useState(() => readProjectPage(pages))
  const [sidebarPage, setSidebarPage] = useState(() => readProjectPage(pages))
  const details = pages.project
  const page = pages[activePage]
  const videoPage = isProjectVideoPage(page)
  const description = details?.explain || details?.detail || {}
  const thumbnails = Object.entries(details || {}).filter(([key]) => /^thumbnail\d*$/.test(key))

  useLayoutEffect(() => {
    if (activePage !== 'project' || !titleRef.current) return
    let disposed = false
    const syncShadow = () => {
      if (disposed) return
      const navigation = document.querySelector('[data-floating-navigation-anchor]')
      if (navigation && contentRef.current) {
        const available = navigation.getBoundingClientRect().left - contentRef.current.getBoundingClientRect().left - 24
        contentRef.current.style.setProperty('--thumbnail-available-width', `${Math.max(0, available)}px`)
      }
      const reference = document.createElement('h1')
      reference.className = 'hero-title'
      reference.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none'
      document.body.append(reference)
      const mainStyle = getComputedStyle(reference)
      const offsets = mainStyle.textShadow.replace(/rgba?\([^)]*\)/g, '').trim().split(/\s+/).map(parseFloat)
      const ratio = parseFloat(getComputedStyle(titleRef.current).fontSize) / parseFloat(mainStyle.fontSize)
      reference.remove()
      titleRef.current.style.setProperty('--title-shadow-x', `${offsets[0] * ratio}px`)
      titleRef.current.style.setProperty('--title-shadow-y', `${offsets[1] * ratio}px`)
    }
    syncShadow()
    document.fonts.ready.then(syncShadow)
    window.addEventListener('resize', syncShadow)
    return () => { disposed = true; window.removeEventListener('resize', syncShadow) }
  }, [activePage, project])

  useLayoutEffect(() => {
    const container = thumbnailsRef.current
    if (activePage !== 'project' || !container || thumbnails.length < 2) return
    let frame = 0
    const syncThumbnails = () => {
      frame = 0
      const figures = [...container.querySelectorAll('figure')]
      const ratios = figures.map(figure => {
        const image = figure.querySelector('img')
        return image?.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1.92
      })
      const gap = parseFloat(getComputedStyle(container).columnGap) || 0
      const availableWidth = Math.max(0, container.clientWidth - gap * (figures.length - 1))
      const singleHeight = Math.min(contentRef.current.clientWidth, 1000) / ratios[0]
      const height = Math.max(0, Math.min(container.clientHeight, singleHeight, availableWidth / ratios.reduce((sum, ratio) => sum + ratio, 0)))
      container.style.setProperty('--thumbnail-common-height', `${height}px`)
      figures.forEach((figure, index) => figure.style.setProperty('--thumbnail-aspect-ratio', ratios[index]))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(syncThumbnails) }
    syncThumbnails()
    const observer = new ResizeObserver(schedule)
    observer.observe(container)
    container.addEventListener('load', schedule, true)
    container.addEventListener('error', schedule, true)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      container.removeEventListener('load', schedule, true)
      container.removeEventListener('error', schedule, true)
    }
  }, [activePage, project, thumbnails.length])

  useEffect(() => {
    const update = () => {
      const key = readProjectPage(project?.pages || {})
      setActivePage(key)
      setSidebarPage(key)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [project])

  const navigate = (event, key) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (key === activePage) return
    const href = event.currentTarget.href
    const navigate = () => {
      window.history.pushState(null, '', href)
      setActivePage(key)
      setSidebarPage(key)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    const transition = new CustomEvent('portfolio-page-navigate', {
      cancelable: true,
      detail: { navigate, start: () => setSidebarPage(key), page: contentRef.current.parentElement },
    })
    if (window.dispatchEvent(transition)) navigate()
  }

  if (!project) return <main className={styles.page}><h1 className={styles.notFound}>PROJECT NOT FOUND</h1></main>

  return (
    <main className={`${styles.page} ${activePage === 'project' ? styles.projectPage : videoPage ? styles.videoPage : styles.galleryPage}`}>
      <ProjectSidebar projectId={project.id} pages={pages} activePage={sidebarPage} onNavigate={navigate} returnPath={frontend ? '/frontend' : '/industrial-design'} />
      <div ref={contentRef} className={styles.content} key={activePage}>
        {activePage === 'project' ? (
          <>
            <div className={styles.intro}>
              <header className={styles.heading}>
                {details?.summary && <p>{details.summary}</p>}
                <h1 ref={titleRef}>{details?.title || project.id}</h1>
              </header>
              {Object.keys(description).length > 0 && <ul className={styles.explain}>
                {Object.entries(description).map(([key, text]) => (
                  <li key={key}>
                    <SparkleShape className={`sparkle-mark__icon ${styles.sparkle}`} size={32} color="var(--point-color)" />
                    <p>{text}</p>
                  </li>
                ))}
              </ul>}
            </div>
            <div ref={thumbnailsRef} className={`${styles.thumbnails} ${thumbnails.length > 1 ? styles.multipleThumbnails : ''}`} style={{ '--thumbnail-count': Math.max(1, thumbnails.length) }}>
              {thumbnails.map(([key, path]) => <DetailImage key={key} path={path} label={details?.title || project.id} first />)}
            </div>
          </>
        ) : (
          <div className={styles.gallery} style={videoPage ? { '--video-count': page.images.length } : undefined}>
            {(page?.images || []).map((image, index) => isProjectVideo(image.url)
              ? <DetailVideo key={`${image.url}-${index}`} path={image.url} label={`${details?.title || project.id} ${page.pageName}`} />
              : isProjectPdf(image.url)
                ? <ProjectPdf key={`${image.url}-${index}`} path={image.url} label={`${details?.title || project.id} ${page.pageName} ${image.caption || index + 1}`} />
              : <DetailImage key={`${image.url}-${index}`} path={image.url} label={image.caption || page.pageName} first={index === 0} />)}
          </div>
        )}
      </div>
    </main>
  )
}
