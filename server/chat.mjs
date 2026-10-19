import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import frontend from '../portfolio/src/data/frontend.json' with { type: 'json' }
import industrial from '../portfolio/src/data/industrialDesign.json' with { type: 'json' }
import profile from '../portfolio/src/data/chatbotProfile.json' with { type: 'json' }

const defaultModel = 'gpt-5.6-terra'
const catalog = [...frontend.projects, ...industrial.projects].map(project => ({
  id: project.id,
  title: project.pages.project.title,
  summary: project.pages.project.summary,
  categories: [project.category, project.category2, project.category3].filter(Boolean),
  teamProject: project.teamProject,
  explain: project.pages.project.explain || {},
  href: `/project/${encodeURIComponent(project.id)}`,
}))
const prompt = readFileSync(new URL('./prompts/chatbot.md', import.meta.url), 'utf8').trim()
if (!prompt) throw new Error('The portfolio chatbot prompt must not be empty.')
const instructions = `${prompt}

<portfolio_reference_data>
${JSON.stringify({ profile, projects: catalog })}
</portfolio_reference_data>`

class ChatError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

function response(status, body, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } })
}

async function readMessages(request) {
  const reader = request.body?.getReader()
  if (!reader) throw new ChatError(400, '질문을 입력해 주세요.')
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 32768) {
        void reader.cancel().catch(() => {})
        throw new ChatError(413, '대화가 너무 깁니다. 새 대화를 시작해 주세요.')
      }
      chunks.push(Buffer.from(value))
    }
  } finally { reader.releaseLock() }
  let body
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new ChatError(400, '요청 형식이 올바르지 않습니다.') }
  if (!Array.isArray(body?.messages) || !body.messages.length || body.messages.length > 8) throw new ChatError(400, '최근 대화 8개까지 전송할 수 있습니다.')
  let total = 0
  const messages = body.messages.map(message => {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string') throw new ChatError(400, '대화 형식이 올바르지 않습니다.')
    const content = message.content.trim()
    const maximum = message.role === 'user' ? 1200 : 4000
    if (!content || content.length > maximum) throw new ChatError(400, '질문은 1,200자 이내로 입력해 주세요.')
    total += content.length
    return { role: message.role, content }
  })
  if (total > 8000 || messages.at(-1).role !== 'user') throw new ChatError(400, '대화가 너무 길거나 마지막 질문이 없습니다.')
  return messages
}

export function createChatHandler({ env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  // Best-effort protection per warm server instance, not a shared spending cap.
  const instanceQuota = new Map()
  const checkQuota = request => {
    const time = now()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
    const identifier = createHash('sha256').update(`${env.OPENAI_API_KEY}:${ip}`).digest('hex').slice(0, 32)
    const dailyLimit = Number(env.CHAT_DAILY_LIMIT || 100)
    if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 10000) throw new ChatError(503, '챗봇 연결 설정을 확인해야 합니다.')
    const keys = [
      `portfolio:chat:minute:${identifier}:${Math.floor(time / 60000)}`,
      `portfolio:chat:hour:${identifier}:${Math.floor(time / 3600000)}`,
      `portfolio:chat:day:${Math.floor(time / 86400000)}`,
    ]
    const limits = [5, 20, dailyLimit]
    const ttl = [60, 3600, 86400]
    for (const [key, value] of instanceQuota) if (value.expires <= time) instanceQuota.delete(key)
    if (keys.some((key, index) => (instanceQuota.get(key)?.count || 0) >= limits[index])) return false
    keys.forEach((key, index) => {
      const existing = instanceQuota.get(key)
      instanceQuota.set(key, { count: (existing?.count || 0) + 1, expires: existing?.expires || time + ttl[index] * 1000 })
    })
    return true
  }

  return async request => {
    if (request.method !== 'POST') return response(405, { error: 'POST 요청만 지원합니다.' }, { Allow: 'POST' })
    const origin = request.headers.get('origin')
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') return response(403, { error: '이 사이트에서만 요청할 수 있습니다.' })
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return response(415, { error: 'JSON 요청만 지원합니다.' })
    try {
      const messages = await readMessages(request)
      if (!env.OPENAI_API_KEY?.trim() || env.CHATBOT_ENABLED === 'false') throw new ChatError(503, '챗봇 연결 설정이 아직 완료되지 않았습니다.')
      if (!checkQuota(request)) return response(429, { error: '지금은 질문이 많습니다. 잠시 후 다시 시도해 주세요.' }, { 'Retry-After': '60' })
      const model = env.OPENAI_MODEL?.trim() || defaultModel
      const upstream = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, instructions, input: messages, store: false, max_output_tokens: 1000,
          ...(model === defaultModel ? { reasoning: { effort: 'none' } } : {}),
          text: { format: { type: 'json_schema', name: 'portfolio_answer', strict: true, schema: {
            type: 'object', properties: {
              answer: { type: 'string' },
              projectIds: { type: 'array', items: { type: 'string', enum: catalog.map(project => project.id) } },
            }, required: ['answer', 'projectIds'], additionalProperties: false,
          } } },
        }),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(25000)]),
      })
      if (!upstream.ok) throw new ChatError(upstream.status === 429 ? 503 : 502, 'AI 응답을 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      const data = await upstream.json()
      const content = (data.output || []).filter(item => item.type === 'message').flatMap(item => item.content || [])
      if (content.some(item => item.type === 'refusal')) return response(200, { reply: '해당 질문에는 답변하기 어렵습니다. 포트폴리오와 프로젝트에 관한 질문을 부탁드립니다.', projects: [] })
      const text = content.filter(item => item.type === 'output_text').map(item => item.text).join('')
      let answer
      try { answer = JSON.parse(text) } catch { throw new ChatError(502, '응답을 완성하지 못했습니다. 다시 질문해 주세요.') }
      if (data.status !== 'completed' || typeof answer.answer !== 'string' || !answer.answer.trim() || answer.answer.length > 4000 || !Array.isArray(answer.projectIds)) throw new ChatError(502, '응답을 완성하지 못했습니다. 다시 질문해 주세요.')
      const projects = [...new Set(answer.projectIds)].map(id => catalog.find(project => project.id === id)).filter(Boolean).slice(0, 3).map(({ id, title, href }) => ({ id, title, href }))
      return response(200, { reply: answer.answer.trim(), projects })
    } catch (error) {
      if (request.signal.aborted) return response(499, { error: '요청이 취소되었습니다.' })
      if (error.name === 'TimeoutError') return response(504, { error: '응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.' })
      return response(error instanceof ChatError ? error.status : 502, { error: error instanceof ChatError ? error.message : '챗봇 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.' })
    }
  }
}

export const chatHandler = createChatHandler()
