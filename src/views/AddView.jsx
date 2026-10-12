import { useState } from 'react'
import * as db from '../lib/db'
import { todayStr } from '../lib/format'

export default function AddView({ cats, onSaved }) {
  const [kind, setKind] = useState('expense')
  const [amount, setAmount] = useState('')
  const [catId, setCatId] = useState(cats[0]?.id ?? null)
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(todayStr())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const value = Number(String(amount).replace(/[^0-9.]/g, ''))

  const save = async (e) => {
    e.preventDefault()
    if (!(value > 0)) return setErr('Enter an amount above $0.')
    if (kind === 'expense' && !catId) return setErr('Pick a category.')
    setBusy(true); setErr('')
    try {
      const t = await db.addTransaction({
        date, kind, amount: Math.round(value * 100) / 100,
        description: desc.trim(), category_id: kind === 'expense' ? catId : null,
      })
      onSaved(t)
    } catch (e2) {
      setErr(e2.message)
      setBusy(false)
    }
  }

  return (
    <form className="view add" onSubmit={save}>
      <h1 className="page-title">Add</h1>

      <div className="segmented">
        <button type="button" className={kind === 'expense' ? 'on' : ''} onClick={() => setKind('expense')}>Expense</button>
        <button type="button" className={kind === 'income' ? 'on income' : ''} onClick={() => setKind('income')}>Income</button>
      </div>

      <label className={`amount ${kind}`}>
        <span className="amount-sign">$</span>
        <input
          inputMode="decimal" placeholder="0.00" value={amount} autoFocus
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          aria-label="Amount"
        />
      </label>

      {kind === 'expense' && (
        <>
          <div className="field-label">Category</div>
          <div className="chips">
            {cats.map((c) => (
              <button type="button" key={c.id} className={`chip-btn ${catId === c.id ? 'on' : ''}`} onClick={() => setCatId(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}

      <label className="field">
        <span>Description</span>
        <input value={desc} maxLength={200} placeholder={kind === 'income' ? 'Paycheck' : 'What was it?'} onChange={(e) => setDesc(e.target.value)} />
      </label>

      <label className="field">
        <span>Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value || todayStr())} />
      </label>

      {err && <div className="form-error">{err}</div>}
      <button className="btn primary block big" disabled={busy}>{busy ? 'Saving…' : `Save ${kind}`}</button>
    </form>
  )
}
