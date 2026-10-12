import { MONTHS, shiftMonth } from '../lib/format'

const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  plus: 'M12 5v14M5 12h14',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  send: 'M5 12h14M13 6l6 6-6 6',
}

export function Icon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}

export function MonthPicker({ ym, setYm }) {
  return (
    <div className="picker">
      <button className="icon-btn" onClick={() => setYm(shiftMonth(ym, -1))} aria-label="Previous month"><Icon name="left" /></button>
      <div className="picker-label">
        <span className="picker-main">{MONTHS[ym.m - 1]}</span>
        <span className="picker-sub">{ym.y}</span>
      </div>
      <button className="icon-btn" onClick={() => setYm(shiftMonth(ym, 1))} aria-label="Next month"><Icon name="right" /></button>
    </div>
  )
}

export function Bar({ value, max, tone }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0
  return <div className="bar"><div className={`bar-fill ${tone || ''}`} style={{ width: `${pct}%` }} /></div>
}

export const toneFor = (spent, budget) => {
  if (budget <= 0) return spent > 0 ? 'over' : ''
  const r = spent / budget
  return r > 1 ? 'over' : r >= 0.9 ? 'warn' : ''
}

// Minimal, safe markdown: paragraphs, bullet lists, **bold**, `code`. No HTML injection.
export function Rich({ text }) {
  const inline = (s, k) =>
    s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={`${k}-${i}`}>{part.slice(2, -2)}</strong>
      if (part.startsWith('`') && part.endsWith('`')) return <code key={`${k}-${i}`}>{part.slice(1, -1)}</code>
      return part
    })
  const blocks = []
  let list = null
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/)
    if (bullet) {
      if (!list) { list = []; blocks.push({ type: 'ul', items: list }) }
      list.push(inline(bullet[1], i))
      return
    }
    list = null
    if (!line.trim()) return
    const h = line.match(/^#{1,4}\s+(.*)$/)
    blocks.push({ type: h ? 'h' : 'p', content: inline(h ? h[1] : line, i) })
  })
  return (
    <div className="rich">
      {blocks.map((b, i) =>
        b.type === 'ul' ? <ul key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
          : b.type === 'h' ? <p key={i} className="rich-h">{b.content}</p>
            : <p key={i}>{b.content}</p>,
      )}
    </div>
  )
}
