import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { filterProjects } from '../src/data/projectFilters.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const assetRoot = path.join(root, 'src/assets')
const projectRoot = path.join(assetRoot, 'industrialdesign/industrialdesign')
const { projects } = JSON.parse(await readFile(path.join(root, 'src/data/industrialDesign.json'), 'utf8'))

test('registers every industrial folder with unique IDs and valid metadata', async () => {
  const folders = (await readdir(projectRoot, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name)
  const frontend = JSON.parse(await readFile(path.join(root, 'src/data/frontend.json'), 'utf8')).projects
  const ids = [...frontend, ...projects].map(project => project.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual(projects.map(project => project.pages.project.thumbnail.split('/')[3]).sort(), folders.sort())
  for (const project of projects) {
    assert.ok(project.category === null || ['product', 'branding', 'ui', 'video'].includes(project.category))
    assert.ok(project.teamProject === null || typeof project.teamProject === 'boolean')
    assert.equal(typeof project.pages.project.summary, 'string')
    assert.equal(typeof project.pages.project.explain, 'object')
  }
  assert.equal(filterProjects(projects, 'all').length, projects.length)
  assert.equal(filterProjects(projects, 'team').length, projects.filter(project => project.teamProject === true).length)
  assert.equal(filterProjects(projects, 'personal').length, projects.filter(project => project.teamProject === false).length)
})

test('keeps the requested project order without separate product image pages', () => {
  assert.deepEqual(projects.map(project => project.id), [
    'industrial01', 'industrial03', 'industrial11', 'industrial12',
    'industrial06', 'industrial08', 'industrial09', 'industrial02',
    'industrial07', 'industrial04', 'industrial13', 'industrial10', 'industrial05',
  ])
  for (const project of projects) {
    assert.equal(project.pages.productImages, undefined)
    assert.equal(Object.values(project.pages).some(page => page.pageName === '\uC81C\uD488 \uC774\uBBF8\uC9C0'), false)
  }
})

test('marks only industrial team project summaries with the TEAM suffix', () => {
  for (const project of projects) {
    const summary = project.pages.project.summary
    assert.equal(summary.endsWith('(TEAM)'), project.teamProject === true, project.id)
    assert.equal((summary.match(/\(TEAM\)/g) || []).length, project.teamProject === true ? 1 : 0, project.id)
  }
})

test('connects existing thumbnails and numerically ordered gallery images', async () => {
  const references = new Set()
  const collator = new Intl.Collator('ko', { numeric: true })
  for (const project of projects) {
    for (const page of Object.values(project.pages)) {
      for (const [key, value] of Object.entries(page)) {
        if (/^thumbnail\d*$/.test(key)) references.add(value)
      }
      const urls = (page.images || []).map(image => image.url)
      assert.deepEqual(urls, [...urls].sort(collator.compare))
      urls.forEach(url => references.add(url))
    }
  }
  for (const url of references) {
    assert.equal((await stat(path.join(assetRoot, url.slice(1)))).isFile(), true, url)
  }
})
