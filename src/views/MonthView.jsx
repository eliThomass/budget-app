import { useEffect, useMemo, useState } from 'react'
import * as db from '../lib/db'
import { money, monthRange, prettyDate, sum } from '../lib/format'
import { Bar, Icon, MonthPicker, toneFor } from './ui.jsx'

export default function MonthView({ cats, settings, ym, setYm, rev, onChanged }) {
  const [tx, setTx] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let live = true
    setTx(null)
    const [a, b] = monthRange(ym.y, ym.m)
    db.getTransactions(a, b).then((r) => live && setTx(r)).catch((e) => setErr(e.message))
    return () => { live = false }
  }, [ym.y, ym.m, rev])

  const s = useMemo(() => {
    const list = tx || []
    const income = sum(list.filter((t) => t.kind === 'income'), (t) => t.amount)
    const expenses = list.filter((t) => t.kind === 'expense')
    const spent = sum(expenses, (t) => t.amount)
    const byCat = {}
    for (const t of expenses) byCat[t.category_id ?? 'none'] = (byCat[t.category_id ?? 'none'] || 0) + Number(t.amount)
    const known = new Set(cats.map((c) => c.id))
    const uncategorized = Object.entries(byCat).filter(([k]) => !known.has(k)).reduce((a, [, v]) => a + v, 0)
    const budgeted = sum(cats, (c) => c.budget)
    return { income, spent, byCat, uncategorized, budgeted }
  }, [tx, cats])

  const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]))
  const left = s.income - s.spent
  const toAssign = Number(settings.expected_income || 0) - s.budgeted
  const ref = s.income > 0 ? s.income : s.budgeted

  const remove = async (t) => {
    if (!confirm(`Delete "${t.description || catName[t.category_id] || 'transaction'}" (${money(t.amount)})?`)) return
    try { await db.deleteTransaction(t.id); onChanged() } catch (e) { alert(e.message) }
  }

  return (
    <div className="view">
      <MonthPicker ym={ym} setYm={setYm} />
      {err && <div className="card error">{err}</div>}

      <section className="hero">
        <div className="hero-label">Left this month</div>
        <div className={`hero-value ${left < 0 ? 'neg' : ''}`}>{money(left)}</div>
        <div className="hero-bar"><div style={{ width: `${ref > 0 ? Math.min(100, (s.spent / ref) * 100) : 0}%` }} /></div>
        <div className="hero-stats">
          <div><span>Income in</span><strong>{money(s.income, false)}</strong></div>
          <div><span>Spent</span><strong>{money(s.spent, false)}</strong></div>
          <div><span>Budgeted</span><strong>{money(s.budgeted, false)}</strong></div>
        </div>
      </section>

      {toAssign !== 0 && (
        <div className={`note ${toAssign < 0 ? 'note-warn' : ''}`}>
          {toAssign > 0
            ? <>You have <strong>{money(toAssign, false)}</strong> of expected income not assigned to a category.</>
            : <>Your budgets are <strong>{money(-toAssign, false)}</strong> more than your expected income.</>}
        </div>
      )}

      <h2 className="section-title">Categories</h2>
      <section className="card list">
        {cats.map((c) => {
          const spent = s.byCat[c.id] || 0
          const budget = Number(c.budget) || 0
          const rem = budget - spent
          const tone = toneFor(spent, budget)
          return (
            <div className="cat-row" key={c.id}>
              <div className="cat-top">
                <span className="cat-name">{c.name}</span>
                <span className={`cat-left ${tone}`}>
                  {rem >= 0 ? `${money(rem, false)} left` : `${money(-rem, false)} over`}
                </span>
              </div>
              <Bar value={spent} max={budget} tone={tone} />
              <div className="cat-sub">{money(spent)} of {money(budget, false)}</div>
            </div>
          )
        })}
        {s.uncategorized > 0 && (
          <div className="cat-row">
            <div className="cat-top"><span className="cat-name muted">Uncategorized</span><span className="cat-left">{money(s.uncategorized)}</span></div>
          </div>
        )}
      </section>

      <h2 className="section-title">Transactions</h2>
      <section className="card list">
        {tx === null && <div className="empty"><div className="spinner small" /></div>}
        {tx && tx.length === 0 && <div className="empty">Nothing logged this month yet. Tap <strong>+</strong> to add one.</div>}
        {tx && tx.map((t) => (
          <div className="tx-row" key={t.id}>
            <div className="tx-main">
              <div className="tx-desc">{t.description || (t.kind === 'income' ? 'Income' : catName[t.category_id] || 'Expense')}</div>
              <div className="tx-meta">
                {prettyDate(t.date)} · <span className={`chip ${t.kind === 'income' ? 'chip-income' : ''}`}>
                  {t.kind === 'income' ? 'Income' : catName[t.category_id] || 'Uncategorized'}
                </span>
              </div>
            </div>
            <div className={`tx-amt ${t.kind === 'income' ? 'pos' : ''}`}>{t.kind === 'income' ? '+' : '−'}{money(t.amount)}</div>
            <button className="icon-btn subtle" onClick={() => remove(t)} aria-label="Delete"><Icon name="trash" size={18} /></button>
          </div>
        ))}
      </section>
    </div>
  )
}
