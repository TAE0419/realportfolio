import { compile } from 'sass'
import { fileURLToPath } from 'node:url'
import { createWavePath } from '../src/components/waveGeometry.js'
import { startupReadyKey, appReadyProgress } from '../src/data/loadingConfig.js'

function startBootScreen(readyKey, appProgress) {
  const root = document.documentElement
  let needed = true
  try { needed = sessionStorage.getItem(readyKey) !== 'true' } catch { /* Storage is optional. */ }
  if (!needed) return
  root.setAttribute('data-boot-loading', '')
  root.dataset.bootProgress = '0'
  const paint = value => {
    if (!root.hasAttribute('data-boot-loading')) return
    const progress = Math.max(Number(root.dataset.bootProgress), value)
    root.dataset.bootProgress = String(progress)
    const loader = document.getElementById('boot-loader')
    if (!loader) return
    loader.setAttribute('aria-valuenow', String(progress))
    loader.querySelector('output').textContent = `${progress}%`
    const gradient = loader.querySelector('linearGradient')
    gradient.setAttribute('x1', String(Math.max(0, progress - 28) * 19.2))
    gradient.setAttribute('x2', String(Math.max(0.01, progress * 19.2)))
  }
  // Only the first visit uses critical CSS while the full stylesheet downloads.
  const styles = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
        node.dataset.bootStylesheet = 'pending'
        node.media = 'print'
        const loaded = () => {
          node.media = 'all'
          node.dataset.bootStylesheet = 'ready'
          paint(10)
        }
        node.addEventListener('load', loaded, { once: true })
        node.addEventListener('error', loaded, { once: true })
      }
    }
  })
  styles.observe(document.head, { childList: true })
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') { paint(5); styles.disconnect() }
  })
  window.addEventListener('portfolio-app-ready', () => paint(appProgress), { once: true })
}

export default function bootScreenPlugin() {
  return {
    name: 'portfolio-boot-screen',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const css = compile(fileURLToPath(new URL('../src/components/BootLoader.module.scss', import.meta.url)), { style: 'compressed' }).css
        const fonts = [
          ['Nasalization', 'Nasalization Rg.otf', 'font/Nasalization Rg.otf', 300],
          ['NanumSquare', 'NanumSquareEB.otf', 'font/nanum-square/NanumSquareEB.otf', 700],
        ]
        const faces = fonts.map(([family, name, source, weight]) => {
          const asset = Object.values(context.bundle || {}).find(item => item.type === 'asset' && (item.names || [item.name]).includes(name))
          const href = asset ? `/${asset.fileName}` : `/src/assets/${source}`
          return `@font-face{font-family:'${family}';src:url('${encodeURI(href)}') format('opentype');font-weight:${weight};font-style:normal;font-display:swap;}`
        }).join('')
        return [
          { tag: 'style', children: faces + css, injectTo: 'head-prepend' },
          { tag: 'script', children: `(${startBootScreen.toString()})(${JSON.stringify(startupReadyKey)},${appReadyProgress});`, injectTo: 'head-prepend' },
          { tag: 'div', attrs: { id: 'boot-loader', role: 'progressbar', 'aria-label': '페이지 로딩', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' },
            children: `<p data-boot-label>Loading...</p><svg viewBox="0 -12 1920 64" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="boot-wave-gradient" gradientUnits="userSpaceOnUse" x1="0" x2="0.01"><stop stop-color="currentColor"/><stop offset="1" stop-color="var(--white-color, #fff)"/></linearGradient></defs><path d="${createWavePath()}" stroke="url(#boot-wave-gradient)"/></svg><output>0%</output>`, injectTo: 'body-prepend' },
        ]
      },
    },
  }
}
