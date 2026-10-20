import test from 'node:test'
import assert from 'node:assert/strict'
import { runInNewContext } from 'node:vm'
import bootScreenPlugin from './bootScreen.js'
import { createWavePath } from '../src/components/waveGeometry.js'
import { appReadyProgress, startupReadyKey } from '../src/data/loadingConfig.js'

function bootstrap(ready = false, denied = false) {
  const tags = bootScreenPlugin().transformIndexHtml.handler('', { bundle: {} })
  const script = tags.find(tag => tag.tag === 'script')
  const flags = new Set()
  const root = { dataset: {}, setAttribute: key => flags.add(key), hasAttribute: key => flags.has(key) }
  const events = new Map()
  const document = { head: {}, documentElement: root, readyState: 'interactive', getElementById: () => null,
    addEventListener: (key, callback) => events.set(key, callback) }
  runInNewContext(script.children, { document, MutationObserver: class { constructor(callback) { events.set('styles', callback) } observe() {} disconnect() {} }, window: { addEventListener: (key, callback) => events.set(key, callback) },
    sessionStorage: { getItem(key) { assert.equal(key, startupReadyKey); if (denied) throw new Error('denied'); return ready ? 'true' : null } } })
  return { tags, root, flags, events }
}

test('boot screen is available before app modules and shares the actual wave geometry', () => {
  const { tags, root, flags, events } = bootstrap()
  assert.ok(flags.has('data-boot-loading'))
  assert.equal(root.dataset.bootProgress, '0')
  events.get('readystatechange')()
  assert.equal(root.dataset.bootProgress, '5')
  const linkEvents = new Map()
  const link = { tagName: 'LINK', rel: 'stylesheet', dataset: {}, addEventListener: (key, callback) => linkEvents.set(key, callback) }
  events.get('styles')([{ addedNodes: [link] }])
  assert.equal(link.media, 'print')
  linkEvents.get('load')()
  assert.equal(link.media, 'all')
  assert.equal(link.dataset.bootStylesheet, 'ready')
  assert.equal(root.dataset.bootProgress, '10')
  events.get('portfolio-app-ready')()
  assert.equal(Number(root.dataset.bootProgress), appReadyProgress)
  events.get('readystatechange')()
  assert.equal(Number(root.dataset.bootProgress), appReadyProgress)
  assert.equal(tags.find(tag => tag.tag === 'script').injectTo, 'head-prepend')
  assert.ok(tags.find(tag => tag.tag === 'div').children.includes(createWavePath()))
  flags.delete('data-boot-loading')
  linkEvents.get('load')()
  assert.equal(Number(root.dataset.bootProgress), appReadyProgress)
})

test('boot screen respects the session and works without session storage', () => {
  assert.equal(bootstrap(true).flags.has('data-boot-loading'), false)
  assert.equal(bootstrap(false, true).flags.has('data-boot-loading'), true)
})

test('production boot fonts use emitted assets rather than development source paths', () => {
  const bundle = {
    title: { type: 'asset', names: ['Nasalization Rg.otf'], fileName: 'assets/title.otf' },
    body: { type: 'asset', names: ['NanumSquareEB.otf'], fileName: 'assets/body.otf' },
  }
  const tags = bootScreenPlugin().transformIndexHtml.handler('', { bundle })
  const css = tags.find(tag => tag.tag === 'style').children
  assert.ok(css.includes('/assets/title.otf'))
  assert.ok(css.includes('/assets/body.otf'))
  assert.ok(!css.includes('/src/assets/'))
})
