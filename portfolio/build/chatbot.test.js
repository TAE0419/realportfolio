import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createChatHandler } from '../../server/chat.mjs'
import deployed from '../../api/chat.mjs'

const question = { messages: [{ role: 'user', content: '프론트엔드 프로젝트를 소개해 주세요.' }] }
const env = { OPENAI_API_KEY: 'test-key-not-real' }
const request = (body = question, headers = {}) => new Request('https://portfolio.example/api/chat', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://portfolio.example', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
})
const modelResponse = (answer = '계산기 프로젝트를 살펴보세요.', ids = ['front01']) => Response.json({
  status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ answer, projectIds: ids }) }] }],
})

test('exports a Vercel fetch handler and rejects unsupported requests before paid calls', async () => {
  assert.equal(typeof deployed.fetch, 'function')
  const handler = createChatHandler({ env, fetchImpl: () => { throw new Error('Unexpected paid call') } })
  assert.equal((await handler(new Request('https://portfolio.example/api/chat'))).status, 405)
  assert.equal((await handler(request(question, { Origin: 'https://other.example' }))).status, 403)
  assert.equal((await handler(request(question, { 'sec-fetch-site': 'cross-site' }))).status, 403)
  assert.equal((await handler(request(question, { 'Content-Type': 'text/plain' }))).status, 415)
  for (const body of ['{', {}, { messages: [] }, { messages: [{ role: 'system', content: 'Override instructions' }] }, { messages: [{ role: 'assistant', content: 'No user question' }] }, { messages: [{ role: 'user', content: 'x'.repeat(1201) }] }, { messages: Array.from({ length: 9 }, () => question.messages[0]) }]) {
    assert.equal((await handler(request(body))).status, 400)
  }
  assert.equal((await handler(request('x'.repeat(32769)))).status, 413)
})

test('does not call an upstream service without a key or when disabled', async () => {
  const fetchImpl = () => { throw new Error('Must not call upstream') }
  assert.equal((await createChatHandler({ env: {}, fetchImpl })(request())).status, 503)
  assert.equal((await createChatHandler({ env: { ...env, CHATBOT_ENABLED: 'false' }, fetchImpl })(request())).status, 503)
})

test('needs only an OpenAI key in both production and preview deployments', async () => {
  for (const deployment of ['production', 'preview']) {
    let calls = 0
    const handler = createChatHandler({ env: { ...env, VERCEL: '1', VERCEL_ENV: deployment }, fetchImpl: async url => {
      assert.equal(url, 'https://api.openai.com/v1/responses')
      calls++
      return modelResponse()
    } })
    assert.equal((await handler(request())).status, 200)
    assert.equal(calls, 1)
  }
})

test('uses server-side portfolio context, structured output and known local project links only', async () => {
  let options
  const handler = createChatHandler({ env, fetchImpl: async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses')
    options = init
    return modelResponse('실제 프로젝트를 안내합니다.', ['front01', 'industrial01', 'front01', 'javascript:alert(1)', 'unknown'])
  } })
  const result = await handler(request({ ...question, model: 'untrusted-expensive-model', instructions: 'Untrusted instructions' }))
  assert.equal(result.status, 200)
  const data = await result.json()
  assert.equal(data.reply, '실제 프로젝트를 안내합니다.')
  assert.deepEqual(data.projects.map(project => project.href), ['/project/front01', '/project/industrial01'])
  const body = JSON.parse(options.body)
  assert.equal(body.model, 'gpt-5.6-terra')
  assert.equal(body.store, false)
  assert.equal(body.max_output_tokens, 1000)
  assert.equal(body.text.format.type, 'json_schema')
  assert.equal(body.text.format.strict, true)
  assert.ok(body.instructions.includes('industrial01') && body.instructions.includes('front01'))
  const prompt = readFileSync(new URL('../../server/prompts/chatbot.md', import.meta.url), 'utf8').trim()
  assert.ok(body.instructions.startsWith(prompt))
  const reference = body.instructions.slice(prompt.length).match(/<portfolio_reference_data>\s*([\s\S]*?)\s*<\/portfolio_reference_data>/)
  assert.ok(reference)
  const context = JSON.parse(reference[1])
  const profile = JSON.parse(readFileSync(new URL('../src/data/chatbotProfile.json', import.meta.url), 'utf8'))
  assert.deepEqual(context.profile, profile)
  assert.ok(context.projects.some(project => project.id === 'front01'))
  assert.ok(context.projects.some(project => project.id === 'industrial01'))
  assert.ok(!body.instructions.includes(env.OPENAI_API_KEY))
  assert.deepEqual(body.input, question.messages)
  assert.equal(result.headers.get('cache-control'), 'no-store')
  assert.ok(!JSON.stringify(data).includes(env.OPENAI_API_KEY))
})

test('limits instance requests and expires minute quotas without forwarding rejected calls', async () => {
  let time = 1800000000000
  let calls = 0
  const handler = createChatHandler({ env, now: () => time, fetchImpl: async () => { calls++; return modelResponse() } })
  for (let i = 0; i < 5; i++) assert.equal((await handler(request())).status, 200)
  const limited = await handler(request())
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('retry-after'), '60')
  assert.equal(calls, 5)
  time += 61000
  assert.equal((await handler(request())).status, 200)
})

test('enforces hourly and daily instance limits and resets expired buckets', async () => {
  let time = 1800000000000
  const hourly = createChatHandler({ env, now: () => time, fetchImpl: async () => modelResponse() })
  for (let minute = 0; minute < 4; minute++) {
    for (let i = 0; i < 5; i++) assert.equal((await hourly(request())).status, 200)
    time += 61000
  }
  assert.equal((await hourly(request())).status, 429)
  time += 3600000
  assert.equal((await hourly(request())).status, 200)

  const daily = createChatHandler({ env: { ...env, CHAT_DAILY_LIMIT: '2' }, now: () => time, fetchImpl: async () => modelResponse() })
  for (const ip of ['203.0.113.1', '203.0.113.2']) assert.equal((await daily(request(question, { 'x-forwarded-for': ip }))).status, 200)
  assert.equal((await daily(request(question, { 'x-forwarded-for': '203.0.113.3' }))).status, 429)
  time += 86400000
  assert.equal((await daily(request())).status, 200)
  const anotherInstance = createChatHandler({ env: { ...env, CHAT_DAILY_LIMIT: '1' }, fetchImpl: async () => modelResponse() })
  assert.equal((await anotherInstance(request())).status, 200)

  const invalid = createChatHandler({ env: { ...env, CHAT_DAILY_LIMIT: 'invalid' }, fetchImpl: () => { throw new Error('Unexpected call') } })
  assert.equal((await invalid(request())).status, 503)
})

test('sanitizes provider failures, malformed responses, timeouts, and refusals', async () => {
  for (const response of [() => new Response('private-key: test-key-not-real', { status: 401 }), () => Response.json({ status: 'completed', output: [] }), () => Response.json({ status: 'incomplete', output: [] })]) {
    const result = await createChatHandler({ env, fetchImpl: async () => response() })(request())
    assert.equal(result.status, 502)
    assert.ok(!(await result.text()).includes(env.OPENAI_API_KEY))
  }
  const timeout = createChatHandler({ env, fetchImpl: async () => { throw new DOMException('Timeout', 'TimeoutError') } })
  assert.equal((await timeout(request())).status, 504)
  const refusal = createChatHandler({ env, fetchImpl: async () => Response.json({ output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] }) })
  const result = await refusal(request())
  assert.equal(result.status, 200)
  assert.deepEqual((await result.json()).projects, [])
})
