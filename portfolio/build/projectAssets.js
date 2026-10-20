import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { normalizeProjectImagePath } from '../src/data/imagePaths.js'
import { cardThumbnails } from './cardThumbnails.js'
import { pdfPages } from './pdfPages.js'
import { isProjectPdf } from '../src/data/projectMedia.js'
import { responsiveImages } from './responsiveImages.js'

const moduleId = 'virtual:project-images'
const resolvedId = `\0${moduleId}`
const portraitModuleId = 'virtual:portrait-image'
const resolvedPortraitId = `\0${portraitModuleId}`

function collectImages(value, images, cards) {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (/^thumbnail\d*$/.test(key)) {
      const image = normalizeProjectImagePath(child)
      if (image) images.add(image)
      if (key === 'thumbnail' && image) cards.add(image)
    }
    if (key === 'images' && Array.isArray(child)) {
      for (const item of child) {
        const image = normalizeProjectImagePath(typeof item === 'string' ? item : item?.url)
        if (image) images.add(image)
      }
    }
    collectImages(child, images, cards)
  }
}

export default function projectAssetsPlugin() {
  let root
  let referencedFiles = new Set()
  const dataDirectory = () => path.join(root, 'src/data')
  const isDataFile = file => {
    const relative = path.relative(dataDirectory(), file)
    return !relative.startsWith('..') && !path.isAbsolute(relative) && relative.endsWith('.json')
  }

  return {
    name: 'project-images',
    configResolved(config) { root = config.root },
    resolveId(id) {
      if (id === moduleId) return resolvedId
      if (id === portraitModuleId) return resolvedPortraitId
    },
    async load(id) {
      if (id === resolvedPortraitId) {
        const filename = path.join(root, 'src/assets/face.jpg')
        this.addWatchFile(filename)
        const variants = await responsiveImages(filename, path.join(root, 'node_modules/.cache/project-details'))
        const imports = variants.map((item, index) => `import image${index} from ${JSON.stringify(`${item.filename.replace(/\\/g, '/')}?url`)};`)
        return `${imports.join('\n')}\nexport default {src: image0, srcSet: ${variants.map((item, index) => `image${index} + ' ${item.width}w'`).join(" + ', ' + ")}, width: ${variants[0].width}, height: ${variants[0].height}};`
      }
      if (id !== resolvedId) return
      const images = new Set()
      const cards = new Set()
      const dataFiles = (await readdir(dataDirectory(), { recursive: true })).filter(file => file.endsWith('.json')).sort()
      for (const file of dataFiles) {
        const filename = path.join(dataDirectory(), file)
        this.addWatchFile(filename)
        collectImages(JSON.parse((await readFile(filename, 'utf8')).replace(/^\uFEFF/, '')), images, cards)
      }
      const imports = []
      const entries = []
      const cardEntries = []
      const pdfEntries = []
      const detailEntries = []
      const dependencies = new Set()
      for (const image of images) {
        const filename = path.join(root, 'src/assets', image.slice(1))
        dependencies.add(path.resolve(filename))
        let file
        try { file = await stat(filename) } catch (error) {
          if (error.code === 'ENOENT' || error.code === 'ENOTDIR') continue
          throw error
        }
        if (!file.isFile()) continue
        this.addWatchFile(filename)
        const name = `image${imports.length}`
        if (isProjectPdf(image)) {
          const pages = await pdfPages(filename, path.join(root, 'node_modules/.cache/project-pdfs'))
          const previews = pages.map((page, index) => {
            const variable = `${name}Page${index}`
            imports.push(`import ${variable} from ${JSON.stringify(`${page.filename.replace(/\\/g, '/')}?url`)};`)
            return `{src: ${variable}, width: ${page.width}, height: ${page.height}}`
          })
          pdfEntries.push(`${JSON.stringify(image)}: [${previews.join(',')}]`)
          // PDFs are displayed as images; do not deploy the oversized source documents.
          continue
        }
        const responsive = await responsiveImages(filename, path.join(root, 'node_modules/.cache/project-details'))
        if (responsive) {
          const sizes = responsive.map((variant, index) => {
            const variable = `${name}Detail${index}`
            imports.push(`import ${variable} from ${JSON.stringify(`${variant.filename.replace(/\\/g, '/')}?url`)};`)
            return { ...variant, variable }
          })
          const fallback = sizes.find(size => size.width >= 1280) || sizes.at(-1)
          entries.push(`${JSON.stringify(image)}: ${fallback.variable}`)
          detailEntries.push(`${JSON.stringify(image)}: {src: ${fallback.variable}, srcSet: ${sizes.map(size => `${size.variable} + ' ${size.width}w'`).join(" + ', ' + ")}, width: ${fallback.width}, height: ${fallback.height}}`)
        } else {
          imports.push(`import ${name} from ${JSON.stringify(`${filename.replace(/\\/g, '/')}?url`)};`)
          entries.push(`${JSON.stringify(image)}: ${name}`)
        }
        if (cards.has(image)) {
          const variants = await cardThumbnails(filename, path.join(root, 'node_modules/.cache/project-cards'))
          const sizes = variants.map((variant, index) => {
            const variable = `${name}Card${index}`
            imports.push(`import ${variable} from ${JSON.stringify(`${variant.filename.replace(/\\/g, '/')}?url`)};`)
            return { variable, width: variant.width }
          })
          cardEntries.push(`${JSON.stringify(image)}: {src: ${sizes[0].variable}, srcSet: ${sizes.map(size => `${size.variable} + ' ${size.width}w'`).join(" + ', ' + ")}}`)
        }
      }
      referencedFiles = dependencies
      // Only referenced files become imports; unrelated presentation assets stay out of the build.
      return `${imports.join('\n')}\nexport const cardImages = {${cardEntries.join(',')}};\nexport const detailImages = {${detailEntries.join(',')}};\nexport const pdfImages = {${pdfEntries.join(',')}};\nexport default {${entries.join(',')}};`
    },
    configureServer(server) {
      server.watcher.add([dataDirectory(), path.join(root, 'src/assets')])
      const reloadAddedImage = file => {
        if (!referencedFiles.has(path.resolve(file)) && !isDataFile(file)) return
        const module = server.moduleGraph.getModuleById(resolvedId)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', reloadAddedImage)
      server.httpServer?.once('close', () => server.watcher.off('add', reloadAddedImage))
    },
    handleHotUpdate(context) {
      if (!isDataFile(context.file) && !referencedFiles.has(path.resolve(context.file))) return
      const module = context.server.moduleGraph.getModuleById(resolvedId)
      if (!module) return
      context.server.moduleGraph.invalidateModule(module)
      return [...new Set([...context.modules, module])]
    },
  }
}
