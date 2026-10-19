import { Readable } from 'node:stream'
import { createChatHandler } from '../../server/chat.mjs'

export default function chatApiPlugin(env) {
  return {
    name: 'portfolio-chat-api',
    configureServer(server) {
      const handler = createChatHandler({ env })
      server.middlewares.use('/api/chat', async (request, response) => {
        const controller = new AbortController()
        const abort = () => { if (!response.writableEnded) controller.abort() }
        request.on('aborted', abort)
        response.on('close', abort)
        try {
          const result = await handler(new Request(new URL('/api/chat', `http://${request.headers.host}`), {
            method: request.method,
            headers: request.headers,
            signal: controller.signal,
            ...(!['GET', 'HEAD'].includes(request.method) ? { body: Readable.toWeb(request), duplex: 'half' } : {}),
          }))
          response.writeHead(result.status, Object.fromEntries(result.headers))
          response.end(await result.text())
        } catch {
          if (!response.headersSent) response.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          response.end(JSON.stringify({ error: '챗봇 연결에 실패했습니다.' }))
        } finally {
          request.off('aborted', abort)
          response.off('close', abort)
        }
      })
    },
  }
}
