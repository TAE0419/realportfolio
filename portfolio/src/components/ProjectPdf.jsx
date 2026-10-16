import { projectImage, projectPdfPages } from '../data/projectAssets'
import styles from './ProjectPdf.module.scss'

export default function ProjectPdf({ path, label }) {
  const src = projectImage(path)
  if (!src) return null
  const pages = projectPdfPages(path)
  return (
    <section className={styles.document} aria-label={label}>
      {pages.length > 0 ? pages.map((page, index) => (
        <img key={page.src} className={styles.image} src={page.src} width={page.width} height={page.height}
          alt={`${label} ${index + 1}페이지`} loading="lazy" decoding="async" />
      )) : <a className={styles.open} href={src} target="_blank" rel="noopener noreferrer">PDF 열기</a>}
    </section>
  )
}
