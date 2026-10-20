import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import styles from './main.module.scss'
import App from './App.jsx'
import FrontendList from './pages/FrontendList.jsx'
import IndustrialDesignList from './pages/IndustrialDesignList.jsx'
import ProjectDetail from './pages/projectDetail.jsx'
import Site from './components/Site'
import { needsInitialLoading } from './data/startupAssets'

const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
window.history.scrollRestoration = 'manual'
if (pathname === '/' && performance.getEntriesByType('navigation')[0]?.type === 'reload') {
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
}
const Page = pathname === '/frontend'
  ? FrontendList
  : pathname === '/industrial-design'
    ? IndustrialDesignList
    : pathname.startsWith('/project/')
      ? ProjectDetail
      : App

const initialLoading = needsInitialLoading()
if (initialLoading) {
  document.documentElement.setAttribute('data-initial-loading', '')
} else document.getElementById('boot-loader')?.remove()

const bootStyles = [...document.querySelectorAll('link[data-boot-stylesheet]')]
Promise.all(bootStyles.filter(link => !link.sheet).map(link => new Promise(resolve => {
  link.addEventListener('load', resolve, { once: true })
  link.addEventListener('error', resolve, { once: true })
}))).then(() => {
  bootStyles.forEach(link => { link.media = 'all'; link.dataset.bootStylesheet = 'ready' })
  if (initialLoading) window.dispatchEvent(new Event('portfolio-app-ready'))
  createRoot(document.getElementById(styles.rootId)).render(
    <StrictMode>
      <Site Page={Page} initialLoading={initialLoading} />
    </StrictMode>,
  )
})
