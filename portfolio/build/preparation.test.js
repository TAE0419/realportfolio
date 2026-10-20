import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareTasks, settleWithin } from '../src/data/preparation.js'

test('preparation has one overall deadline even when all queued requests stall', async () => {
  let started = 0
  const progress = []
  const tasks = Array.from({ length: 40 }, () => () => { started++; return new Promise(() => {}) })
  const result = await prepareTasks(tasks, value => progress.push(value), { duration: 20 })
  assert.deepEqual(result, { completed: 0, total: 40, timedOut: true })
  assert.equal(started, 4)
  assert.deepEqual(progress, [1])
})

test('preparation limits concurrency, settles failed images and reports completion', async () => {
  let active = 0
  let maximum = 0
  const tasks = Array.from({ length: 12 }, (_, index) => async () => {
    active++
    maximum = Math.max(maximum, active)
    await new Promise(resolve => setTimeout(resolve, 2))
    active--
    if (index === 2) throw new Error('missing image')
  })
  const result = await prepareTasks(tasks, () => {}, { duration: 1000 })
  assert.equal(result.completed, 12)
  assert.equal(result.timedOut, false)
  assert.equal(maximum, 4)
  await settleWithin(new Promise(() => {}), 5)
  await settleWithin(Promise.reject(new Error('failed font')), 5)
})
