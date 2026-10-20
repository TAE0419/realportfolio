import frontendData from './frontend.json'
import industrialData from './industrialDesign.json'
import { projectCardImage, projectDetailImage, projectPdfPages } from './projectAssets'
import portrait from 'virtual:portrait-image'
import texture from '../assets/texture.png'
import { prepareTasks } from './preparation'
import { startupReadyKey } from './loadingConfig'

const listeners = new Set()
let preparation
let progress = 0

export function needsInitialLoading() {
  try { return sessionStorage.getItem(startupReadyKey) !== 'true' } catch { return true }
}

export function markInitialLoadingComplete() {
  try { sessionStorage.setItem(startupReadyKey, 'true') } catch { /* Storage is optional. */ }
}

function decodeImage({ src, srcSet, sizes }, signal) {
  const image = new Image()
  image.decoding = 'async'
  if (sizes) image.sizes = sizes
  if (srcSet) image.srcset = srcSet
  image.src = src
  const abort = () => { image.removeAttribute('srcset'); image.removeAttribute('src') }
  signal.addEventListener('abort', abort, { once: true })
  return image.decode().finally(() => signal.removeEventListener('abort', abort))
}

export function prepareStartupAssets(onProgress) {
  listeners.add(onProgress)
  if (!preparation) {
    const projects = [...frontendData.projects, ...industrialData.projects]
    const thumbnails = [...new Set(projects.map(project => projectCardImage(project.pages?.project?.thumbnail).src).filter(Boolean))]
    const banners = [frontendData.projects[0], industrialData.projects[0]].map(project => ({
      ...projectCardImage(project?.pages?.project?.thumbnail), sizes: '56vw',
    })).filter(image => image.src)
    const [, route, id, pageKey = 'project'] = window.location.pathname.split('/')
    const activeProject = projects.find(project => project.id === id)
    const page = activeProject?.pages?.[pageKey]
    const primary = route === 'project'
      ? (pageKey === 'project' ? Object.entries(page || {}).filter(([key]) => /^thumbnail\d*$/.test(key)).map(([, value]) => value) : [page?.images?.[0]?.url])
        .filter(value => /\.(?:png|jpe?g|webp|avif|pdf)$/i.test(value || '')).map(path => ({
          ...(/\.pdf$/i.test(path) ? projectPdfPages(path)[0] : projectDetailImage(path)), sizes: '80vw',
        })).filter(image => image.src)
      : []
    const tasks = [
      () => Promise.all([
        document.fonts.load('300 44px "Nasalization"'),
        document.fonts.load('300 16px "NanumSquare"'),
        document.fonts.load('700 16px "NanumSquare"'),
      ]).then(() => document.fonts.ready),
      ...primary.map(image => signal => decodeImage(image, signal)),
      signal => decodeImage({ ...portrait, sizes: '(max-width: 700px) 120px, (max-width: 900px) 160px, 300px' }, signal),
      signal => decodeImage({ src: texture }, signal),
      ...banners.map(image => signal => decodeImage(image, signal)),
      ...thumbnails.map(src => signal => decodeImage({ src }, signal)),
    ]
    // Bound total startup waiting, not each queued image. Remaining media stays lazy.
    preparation = prepareTasks(tasks, value => {
      progress = value
      listeners.forEach(report => report(value))
    }).then(() => new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    }))
  }
  onProgress(progress)
  return { ready: preparation, unsubscribe: () => listeners.delete(onProgress) }
}
