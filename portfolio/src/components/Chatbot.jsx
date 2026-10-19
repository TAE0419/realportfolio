import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowUp, RotateCcw, Square, X } from 'lucide-react'
import { chatFacePath } from './chatbotLayout'
import styles from './Chatbot.module.scss'

const greeting = { id: 'greeting', role: 'assistant', content: "안녕하세요. 김태은의 포트폴리오 챗봇, '초롱'입니다." }

export default function Chatbot({ open, ready, stage, onClose }) {
  const dialogRef = useRef(null)
  const returnFocusRef = useRef(null)
  const inputRef = useRef(null)
  const historyRef = useRef(null)
  const requestRef = useRef(null)
  const [messages, setMessages] = useState([greeting])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [bounds, setBounds] = useState({ width: 560, height: 680, bottom: 36, gutter: 44 })
  const [inputHeight, setInputHeight] = useState(44)
  const radius = Math.min(84, bounds.width * 0.18, bounds.height * 0.18)

  const cancelReply = useCallback(() => {
    if (!requestRef.current) return
    requestRef.current.abort()
    requestRef.current = null
    setBusy(false)
    setError('응답을 중단했습니다.')
  }, [])
  const close = () => { cancelReply(); onClose() }

  useEffect(() => {
    if (!open) return
    returnFocusRef.current = document.querySelector('[data-floating-navigation-trigger]')
    return () => {
      returnFocusRef.current?.focus({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    if (ready) inputRef.current.focus({ preventScroll: true })
    if (stage === 'concealing' || stage === 'closed') cancelReply()
  }, [ready, stage, cancelReply])

  useEffect(() => {
    if (!open) return
    const dismiss = event => {
      if (event.type === 'keydown') {
        if (event.key === 'Escape') { event.preventDefault(); cancelReply(); onClose() }
        return
      }
      if (!ready || dialogRef.current.contains(event.target) || event.target.closest('nav[aria-label="페이지 이동"]')) return
      cancelReply()
      onClose()
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => {
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('pointerdown', dismiss)
    }
  }, [open, ready, onClose, cancelReply])

  useLayoutEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const measure = () => {
      const rect = dialog.getBoundingClientRect()
      const style = getComputedStyle(dialog)
      const next = { width: rect.width, height: rect.height, bottom: parseFloat(style.getPropertyValue('--input-bottom')), gutter: parseFloat(style.getPropertyValue('--input-gutter')) }
      setBounds(current => Object.keys(next).every(key => current[key] === next[key]) ? current : next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(dialog)
    return () => observer.disconnect()
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const input = inputRef.current
    const resize = () => {
      input.style.height = '0px'
      const lineHeight = parseFloat(getComputedStyle(input).lineHeight)
      const headerHeight = dialogRef.current.querySelector('header').offsetHeight
      const maximum = Math.max(lineHeight, Math.min(lineHeight * 5, bounds.height - headerHeight - bounds.bottom - 84))
      const height = Math.min(input.scrollHeight, maximum)
      input.style.height = `${height}px`
      input.style.overflowY = input.scrollHeight > height ? 'auto' : 'hidden'
      setInputHeight(Math.max(44, height + 20))
    }
    resize()
    document.fonts.ready.then(() => { if (input.isConnected && dialogRef.current?.open) resize() })
  }, [draft, open, bounds.width, bounds.height, bounds.bottom])

  useEffect(() => () => { requestRef.current?.abort() }, [])
  useEffect(() => {
    if (open && historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight
  }, [messages, busy, error, open, inputHeight])

  const send = async (retry = false) => {
    if (!ready || requestRef.current || (!retry && !draft.trim())) return
    const conversation = retry ? messages : [...messages, { id: crypto.randomUUID(), role: 'user', content: draft.trim() }].slice(-40)
    if (conversation.at(-1)?.role !== 'user') return
    const controller = new AbortController()
    requestRef.current = controller
    setMessages(conversation)
    if (!retry) setDraft('')
    setError('')
    setBusy(true)
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, 35000)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation.filter(message => message.id !== 'greeting').slice(-8).map(({ role, content }) => ({ role, content })) }),
        signal: controller.signal,
      })
      const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
      if (!response.ok) throw new Error(data?.error || '챗봇 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      if (typeof data?.reply !== 'string' || !data.reply.trim()) throw new Error('답변을 받지 못했습니다. 다시 시도해 주세요.')
      const projects = Array.isArray(data.projects) ? data.projects.filter(project => typeof project.title === 'string' && /^\/project\/[a-zA-Z0-9_-]+$/.test(project.href)).slice(0, 3) : []
      if (requestRef.current === controller) setMessages(current => [...current, { id: crypto.randomUUID(), role: 'assistant', content: data.reply, projects }])
    } catch (failure) {
      if (requestRef.current === controller) setError(timedOut ? '응답이 지연되고 있습니다. 다시 시도해 주세요.' : failure.message || '연결에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      clearTimeout(timer)
      if (requestRef.current === controller) { requestRef.current = null; setBusy(false) }
    }
  }

  return (
    <div className={styles.viewport}>
    <dialog id="portfolio-chatbot" ref={dialogRef} open={open} className={styles.dialog} aria-labelledby="portfolio-chatbot-title"
      data-ready={ready} aria-modal="false" inert={!ready}
      style={{ '--input-height': `${inputHeight}px`, '--chat-radius': `${radius}px` }}
      onCancel={event => { event.preventDefault(); close() }}
      onWheel={event => event.stopPropagation()}>
      <span className={styles.tether} aria-hidden="true" />
      <div className={styles.surface}>
      <div className={styles.shadow} aria-hidden="true" />
      <svg className={styles.face} width={bounds.width} height={bounds.height} viewBox={`0 0 ${bounds.width} ${bounds.height}`} aria-hidden="true">
        <path d={chatFacePath(bounds.width, bounds.height, inputHeight, bounds.bottom, bounds.gutter, radius)} />
      </svg>
      <header className={styles.header}>
        <h2 id="portfolio-chatbot-title" className={styles.screenReader}>김태은 포트폴리오 AI 챗봇</h2>
        <span className={styles.eyes} aria-hidden="true"><i /><i /></span>
        <div className={styles.tools}>
          <button type="button" title="새 대화" aria-label="새 대화" disabled={messages.length === 1 && !busy}
            onClick={() => { cancelReply(); setMessages([greeting]); setDraft(''); setError(''); inputRef.current.focus() }}><RotateCcw size={18} /></button>
          <button type="button" title="챗봇 닫기" aria-label="챗봇 닫기" onClick={close}><X size={20} /></button>
        </div>
      </header>
      <div className={styles.history} ref={historyRef} role="log" aria-label="챗봇 대화" aria-live="polite" aria-relevant="additions text" aria-busy={busy}>
        {messages.map(message => (
          <div key={message.id} className={`${styles.message} ${message.role === 'user' ? styles.user : ''}`} aria-label={message.role === 'user' ? '내 질문' : 'AI 응답'}>
            <p>{message.content}</p>
            {message.projects?.length > 0 && <ul className={styles.projects}>{message.projects.map(project => (
              <li key={project.href}><a href={project.href} onClick={close}>{project.title}</a></li>
            ))}</ul>}
          </div>
        ))}
        {busy && <p className={styles.pending} role="status">답변을 작성하고 있습니다<span aria-hidden="true">...</span></p>}
      </div>
      {error && <div className={styles.error} role="alert"><p>{error}</p>
        {messages.at(-1)?.role === 'user' && <button type="button" onClick={() => send(true)} disabled={busy}><RotateCcw size={14} />다시 시도</button>}
      </div>}
      <form className={styles.composer} onSubmit={event => { event.preventDefault(); void send() }}>
        <label className={styles.inputLabel} htmlFor="portfolio-chatbot-question">질문</label>
        <textarea id="portfolio-chatbot-question" ref={inputRef} rows={1} maxLength={1200} value={draft} aria-label="챗봇 질문" aria-describedby="portfolio-chatbot-privacy" placeholder="질문을 입력하세요"
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void send() }
          }} />
        <button className={styles.send} type={busy ? 'button' : 'submit'} disabled={!busy && !draft.trim()}
          title={busy ? '응답 중단' : '질문 보내기'} aria-label={busy ? '응답 중단' : '질문 보내기'} onClick={busy ? cancelReply : undefined}>
          {busy ? <Square size={16} /> : <ArrowUp size={20} />}
        </button>
      </form>
      <p className={styles.privacy} title="대화 내용은 AI 응답 생성을 위해 OpenAI로 전송됩니다.">AI · OpenAI로 전송<span id="portfolio-chatbot-privacy" className={styles.screenReader}>대화 내용은 AI 응답 생성을 위해 OpenAI로 전송됩니다.</span></p>
      </div>
    </dialog>
    </div>
  )
}
