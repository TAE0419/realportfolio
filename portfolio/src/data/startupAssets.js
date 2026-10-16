import frontendData from './frontend.json'
import industrialData from './industrialDesign.json'
import { projectCardImage } from './projectAssets'
import portrait from '../assets/face.jpg'
import texture from '../assets/texture.png'

const readyKey = 'portfolio-startup-ready'
const listeners = new Set()
let preparation
let completed = 0
let total = 0

export function needsInitialLoading() {
  try { return sessionStorage.getItem(readyKey) !== 'true' } catch { return true }
}

export function markInitialLoadingComplete() {
  try { sessionStorage.setItem(readyKey, 'true') } catch { /* Storage is optional. */ }
}

function decodeImage({ src, srcSet, sizes }) {
  const image = new Image()
  image.decoding = 'async'
  if (sizes) image.sizes = sizes
  if (srcSet) image.srcset = srcSet
  image.src = src
  return image.decode()
}

function settleWithin(promise, duration = 8000) {
  return new Promise(resolve => {
    const timer = window.setTimeout(resolve, duration)
    Promise.resolve(promise).catch(() => {}).finally(() => { clearTimeout(timer); resolve() })
  })
}

export function prepareStartupAssets(onProgress) {
  listeners.add(onProgress)
  if (!preparation) {
    const projects = [...frontendData.projects, ...industrialData.projects]
    const thumbnails = [...new Set(projects.map(project => projectCardImage(project.pages?.project?.thumbnail).src).filter(Boolean))]
    const banners = [frontendData.projects[0], industrialData.projects[0]].map(project => ({
      ...projectCardImage(project?.pages?.project?.thumbnail), sizes: '56vw',
    })).filter(image => image.src)
    const tasks = [
      () => Promise.all([
        document.fonts.load('300 44px "Nasalization"'),
        document.fonts.load('300 16px "NanumSquare"'),
        document.fonts.load('700 16px "NanumSquare"'),
      ]).then(() => document.fonts.ready),
      ...[portrait, texture, ...thumbnails].map(src => () => decodeImage({ src })),
      ...banners.map(image => () => decodeImage(image)),
    ]
    total = tasks.length
    let next = 0
    // Limit concurrent decoding; never preload original detail images, PDFs or videos.
    const worker = async () => {
      while (next < tasks.length) {
        const task = tasks[next++]
        await settleWithin(Promise.resolve().then(task))
        completed += 1
        listeners.forEach(report => report(completed / total))
      }
    }
    preparation = Promise.all(Array.from({ length: 4 }, worker)).then(() => new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    }))
  }
  onProgress(total ? completed / total : 0)
  return { ready: preparation, unsubscribe: () => listeners.delete(onProgress) }
}
