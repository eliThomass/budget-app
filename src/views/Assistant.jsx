import { useEffect, useRef, useState } from 'react'
import * as db from '../lib/db'
import { MONTHS } from '../lib/format'
import { Icon, Rich } from './ui.jsx'

const KEY = 'budget-chat-v1'
const QUICK = [
  'Summarize this month',
  'Where am I overspending?',
  'Compare this month to last month',
  'How could I save $100 more next month?',
]

const loadChat = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || [] } catch { return [] } }

export default function Assistant({ ym }) {
  const [messages, setMessages] = useState(loadChat)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(messages)) } catch { /* ignore */ }
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  const send = async (text) => {
    const q = text.trim()
    if (!q || busy) return
    const next = [...messages, { role: 'user', content: q }]
    setMessages(next); setInput(''); setBusy(true); setErr('')
    try {
      const reply = await db.askAssistant(next.slice(-20), ym)
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      setErr(e.message || 'Something went wrong.')
      setMessages(messages)
      setInput(q)
    }
    setBusy(false)
  }

  return (
    <div className="view chat">
      <div className="chat-head">
        <h1 className="page-title">Assistant</h1>
        {messages.length > 0 && <button className="btn ghost small" onClick={() => setMessages([])}>New chat</button>}
      </div>
      <div className="context-pill">Looking at <strong>{MONTHS[ym.m - 1]} {ym.y}</strong> plus the 11 months before it</div>

      <div className="messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon"><Icon name="spark" size={28} /></div>
            <p>Ask about your spending, get a summary, or plan next month.</p>
            <div className="quick">
              {QUICK.map((q) => <button key={q} className="chip-btn" onClick={() => send(q)}>{q}</button>)}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'assistant' ? <Rich text={m.content} /> : m.content}
          </div>
        ))}
        {busy && <div className="msg assistant typing"><span /><span /><span /></div>}
        {err && <div className="form-error">{err}</div>}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input) }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your budget…" maxLength={2000} />
        <button className="send" disabled={busy || !input.trim()} aria-label="Send"><Icon name="send" size={20} /></button>
      </form>
    </div>
  )
}
