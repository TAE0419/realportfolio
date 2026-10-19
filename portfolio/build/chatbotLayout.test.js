import test from 'node:test'
import assert from 'node:assert/strict'
import { chatFacePath, chatMotion } from '../src/components/chatbotLayout.js'

test('opens by connecting, lifting and revealing, and reverses that order on close', () => {
  const follow = start => {
    const stages = [start]
    while (chatMotion[stages.at(-1)]) {
      const [next, time] = chatMotion[stages.at(-1)]
      assert.ok(time > 0)
      stages.push(next)
      assert.ok(stages.length < 10)
    }
    return stages
  }
  assert.deepEqual(follow('connecting'), ['connecting', 'lifting', 'revealing', 'open'])
  assert.deepEqual(follow('concealing'), ['concealing', 'lowering', 'disconnecting', 'closed'])
})

test('grows the actual notch upward while preserving its bottom, width and outer corners', () => {
  const short = chatFacePath(560, 680, 44, 36, 44, 84)
  const tall = chatFacePath(560, 680, 140, 36, 44, 84)
  const outer = 'M 84 0 H 560 V 596 Q 560 680 476 680 H 0 V 644'
  assert.ok(short.startsWith(outer) && tall.startsWith(outer))
  assert.ok(short.includes('A 22 22 0 0 0 494 600 H 0'))
  assert.ok(tall.includes('A 22 22 0 0 0 494 504 H 0'))
  assert.ok(short.includes('A 22 22 0 0 0 516 622'))
  assert.ok(tall.includes('A 22 22 0 0 0 516 622'))
  assert.ok(short.endsWith('V 84 Q 0 0 84 0 Z') && tall.endsWith('V 84 Q 0 0 84 0 Z'))
})
