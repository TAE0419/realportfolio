import SparkleMark from './SparkleMark'
import { createWavePath } from './waveGeometry'
import styles from './Footer.module.scss'

const links = [
  { label: 'ABOUT', href: '#about' },
  { label: 'PREVIEW', href: '#preview' },
  { label: 'FRONTEND', href: '/frontend' },
  { label: 'INDUSTRIAL DESIGN', href: '/industrial-design' },
]
const wavePath = createWavePath()

export default function Footer() {
  return (
    <footer className={styles.footer} aria-labelledby="footer-title">
      <svg className={`wave-row ${styles.wave}`} viewBox="0 -12 1920 64" preserveAspectRatio="none" aria-hidden="true">
        <path className="wave-row__highlight" d={wavePath} />
      </svg>
      <div className={styles.content}>
        <div className={styles.identity}>
          <h2 id="footer-title" className={styles.title}>
            <span>KIM TAE EUN</span>
            <span>PORTFOLIO</span>
          </h2>
          <p className={styles.description}>프로젝트의 핵심 가치를 고민하고, 시각 언어와 인터랙션으로 풀어냅니다.</p>
        </div>
        <nav className={styles.navigation} aria-label="푸터 메뉴">
          {links.map(link => <SparkleMark key={link.href} className={styles.link} {...link} />)}
        </nav>
      </div>
    </footer>
  )
}
