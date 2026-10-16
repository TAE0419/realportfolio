import test from 'node:test'
import assert from 'node:assert/strict'
import { isProjectVideo, isProjectVideoPage, isProjectPdf } from '../src/data/projectMedia.js'

test('identifies video paths including remote URLs and query strings', () => {
  for (const url of ['/industrialdesign/mi/video.mp4', '/clip.WEBM', 'https://example.com/clip.mp4?v=2#t=4', '/clip.mov', '/clip.m4v']) {
    assert.equal(isProjectVideo(url), true, url)
  }
  for (const url of [null, undefined, '', '/image.png', '/clip.mp4.png', '/image.png?name=clip.mp4', '/image.png#clip.mp4']) {
    assert.equal(isProjectVideo(url), false, String(url))
  }
})

test('distinguishes PDF documents from image and video resources', () => {
  for (const url of ['/kit/brochure.pdf', '/kit/brochure2.PDF', 'https://example.com/book.pdf?v=2#page=3']) {
    assert.equal(isProjectPdf(url), true, url)
  }
  for (const url of [null, undefined, '', '/cover.pdf.png', '/image.png?name=book.pdf', '/clip.mp4']) {
    assert.equal(isProjectPdf(url), false, String(url))
  }
})

test('fits video-only pages without changing scrolling image or mixed galleries', () => {
  assert.equal(isProjectVideoPage({ images: [{ url: '/clip.mp4' }] }), true)
  assert.equal(isProjectVideoPage({ images: [{ url: '/clip.mp4' }, { url: '/clip2.webm' }] }), true)
  assert.equal(isProjectVideoPage({ images: [{ url: '/clip.mp4' }, { url: '/image.png' }] }), false)
  assert.equal(isProjectVideoPage({ images: [] }), false)
  assert.equal(isProjectVideoPage({ images: [{ url: '/image.png' }] }), false)
  assert.equal(isProjectVideoPage(undefined), false)
})
