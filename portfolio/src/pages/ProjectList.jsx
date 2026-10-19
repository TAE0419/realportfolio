import { useLayoutEffect, useRef, useState } from 'react'
import SparkleShape from '../components/SparkleShape'
import PortfolioCard from '../components/PortfolioCard'
import usePointerTilt from '../components/usePointerTilt'
import FishShadows from '../components/FishShadows'
import frontendData from '../data/frontend.json'
import industrialData from '../data/industrialDesign.json'
import { filterProjects } from '../data/projectFilters'
import { createWavePath } from '../components/waveGeometry'
import styles from './ProjectList.module.scss'

const categories = {
  frontend: ['javascript', 'react', 'next', 'canvas'],
  industrial: ['product', 'branding', 'ui', 'video'],
}

export default function ProjectList({ title }) {
  const titleRef = useRef(null)
  const titleMotionRef = useRef(null)
  const waveRef = useRef(null)
  const closeRef = useRef(null)
  const triggerRef = useRef(null)
  const [panelCategory, setPanelCategory] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  usePointerTilt(titleMotionRef, !isPanelOpen)
  const [projectsVisible, setProjectsVisible] = useState(false)
  const [opening, setOpening] = useState(0)
  const variant = title === 'FRONTEND' ? 'frontend' : 'industrial'
  const lines = variant === 'frontend' ? ['FRONT', 'END'] : ['INDUSTRIAL', 'DESIGN']
  const projects = filterProjects((variant === 'frontend' ? frontendData : industrialData).projects, panelCategory)

  useLayoutEffect(() => {
    const syncGeometry = () => {
      const reference = document.createElement('div')
      reference.setAttribute('aria-hidden', 'true')
      reference.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;top:0;left:0'
      const mainTitle = document.createElement('h1')
      mainTitle.className = 'hero-title'
      const mainWave = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      mainWave.setAttribute('class', 'wave-row')
      reference.append(mainTitle, mainWave)
      document.body.append(reference)

      const mainTitleStyle = window.getComputedStyle(mainTitle)
      const shadow = mainTitleStyle.textShadow.replace(/rgba?\([^)]*\)/g, '').trim().split(/\s+/)
      const ratio = parseFloat(window.getComputedStyle(titleRef.current).fontSize) / parseFloat(mainTitleStyle.fontSize)
      titleMotionRef.current.style.setProperty('--title-shadow-x', `${parseFloat(shadow[0]) * ratio}px`)
      titleMotionRef.current.style.setProperty('--title-shadow-y', `${parseFloat(shadow[1]) * ratio}px`)

      const alongScale = document.documentElement.clientWidth / 1920
      const thickness = parseFloat(window.getComputedStyle(mainWave).height)
      const acrossScale = thickness / 64
      reference.remove()

      const wave = waveRef.current
      const height = wave.parentElement.clientHeight
      wave.style.width = `${thickness}px`
      wave.setAttribute('viewBox', `0 0 ${thickness} ${height}`)
      const length = (height + 256) / alongScale
      const curve = createWavePath(length)
      wave.querySelectorAll('path').forEach((path) => {
        path.setAttribute('d', path.dataset.fill ? `${curve} L ${length + 256} 200 L 0 200 Z` : curve)
        path.setAttribute('transform', `matrix(0 ${alongScale} ${-acrossScale} 0 ${thickness - 12 * acrossScale} -60)`)
      })
    }

    syncGeometry()
    const observer = new ResizeObserver(syncGeometry)
    observer.observe(titleRef.current.closest('main'))
    window.addEventListener('resize', syncGeometry)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncGeometry)
    }
  }, [])

  const closePanel = () => {
    setIsPanelOpen(false)
    triggerRef.current?.focus()
  }

  const filterButton = (label) => (
    <button
      key={label}
      type="button"
      className={`sparkle-mark project-list__filter project-list__filter--${label}`}
      aria-pressed={panelCategory === label}
      aria-controls="category-panel"
      aria-expanded={isPanelOpen && panelCategory === label}
      onClick={(event) => {
        triggerRef.current = event.currentTarget
        setPanelCategory(label)
        setProjectsVisible(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        setOpening(value => value + 1)
        setIsPanelOpen(true)
        requestAnimationFrame(() => closeRef.current?.focus())
      }}
    >
      <SparkleShape className="sparkle-mark__icon" size={32} />
      <span>{label}</span>
    </button>
  )

  return (
    <main className={`${styles.page} project-list--${variant}`}>
      <header className="project-list__hero">
        <a className={styles.homeLink} href="/">메인으로</a>
        <FishShadows seed={variant === 'frontend' ? 71 : 89} schoolCount={1} />
        <div className="project-list__stage">
          <div ref={titleMotionRef} className="project-list__title-motion" data-list-parallax="true">
            <div className="project-list__title-scene">
              <h1 ref={titleRef} className="project-list__title" aria-label={title}>
                {lines.map((line) => <span key={line} aria-hidden="true">{line}</span>)}
              </h1>
              <div className="project-list__title project-list__title-shadow" aria-hidden="true">
                {lines.map((line) => <span key={line}>{line}</span>)}
              </div>
            </div>
          </div>
          <div className="project-list__filters" role="group" aria-label="Project filters" inert={isPanelOpen}>
            {['all', 'team', 'personal', ...categories[variant]].map(filterButton)}
          </div>
          {isPanelOpen && <button className="project-list__dismiss" type="button" aria-label="Close category panel" onClick={closePanel} />}
          <section
            id="category-panel"
            data-scroll-clip="true"
            className={`project-list__panel${isPanelOpen ? ' is-open' : ''}`}
            aria-label={panelCategory ? `${panelCategory} projects` : undefined}
            onKeyDown={(event) => { if (event.key === 'Escape') closePanel() }}
            onTransitionEnd={(event) => {
              if (event.target === event.currentTarget && event.propertyName === 'width' && isPanelOpen) setProjectsVisible(true)
            }}
          >
            <svg ref={waveRef} className="project-list__wave" preserveAspectRatio="none" fill="none" aria-hidden="true">
              <path data-fill="true" className="project-list__wave-fill" />
              <path />
            </svg>
            <div className="project-list__panel-content" inert={!isPanelOpen} aria-hidden={!isPanelOpen}>
              <h2 className="project-list__category">{panelCategory}<span>{({ all: '전체', team: '팀 프로젝트', personal: '개인 프로젝트', javascript: '자바스크립트', react: '리액트', next: '넥스트', canvas: '캔버스', product: '제품 디자인', branding: '브랜딩', ui: 'UI 디자인', video: '영상' })[panelCategory]}</span><span className="project-list__count" aria-live="polite">총 {projects.length}개의 프로젝트가 있습니다.</span></h2>
              <div className="project-list__results" data-scroll-region="프로젝트 목록" key={opening}>
                <ul className="project-list__grid">
                  {projects.map((project, index) => <PortfolioCard key={project.id} project={project} index={index} visible={projectsVisible} />)}
                </ul>
              </div>
              <button ref={closeRef} className="project-list__close" type="button" aria-label="카테고리 닫기" title="닫기" onClick={closePanel}><span aria-hidden="true">×</span></button>
            </div>
          </section>
        </div>
      </header>
    </main>
  )
}
