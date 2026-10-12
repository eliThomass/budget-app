import { useEffect, useRef, useState } from 'react'
import * as db from '../lib/db'
import { DEMO } from '../lib/supabase'
import { money, sum, todayStr } from '../lib/format'
import { Icon } from './ui.jsx'

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function Settings({ cats, settings, reload, flash }) {
  const [income, setIncome] = useState(String(settings.expected_income ?? 0))
  const [rows, setRows] = useState(cats)
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [email, setEmail] = useState('')
  const fileRef = useRef(null)

  useEffect(() => { setRows(cats) }, [cats])
  useEffect(() => { db.userEmail().then(setEmail).catch(() => {}) }, [])

  const guard = (fn) => async (...a) => { try { await fn(...a) } catch (e) { alert(e.message) } }

  const saveIncome = guard(async () => {
    if (Number(income) === Number(settings.expected_income)) return
    await db.saveSettings({ expected_income: income }); await reload(); flash('Saved')
  })
  const saveRow = guard(async (r) => {
    const orig = cats.find((c) => c.id === r.id)
    if (!r.name.trim()) { setRows(cats); return }
    if (orig && orig.name === r.name && Number(orig.budget) === Number(r.budget)) return
    await db.saveCategory({ ...r, name: r.name.trim() }); await reload(); flash('Saved')
  })
  const removeRow = guard(async (r) => {
    if (!confirm(`Delete "${r.name}"? Its past transactions become Uncategorized.`)) return
    await db.deleteCategory(r.id); await reload()
  })
  const addRow = guard(async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    const sort = Math.max(-1, ...cats.map((c) => c.sort ?? 0)) + 1
    await db.saveCategory({ name: newName.trim(), budget: newBudget || 0, sort })
    setNewName(''); setNewBudget(''); await reload(); flash('Category added')
  })
  const exportJson = guard(async () => {
    download(`budget-backup-${todayStr()}.json`, JSON.stringify(await db.exportAll(), null, 2), 'application/json')
  })
  const exportCsv = guard(async () => {
    const dump = await db.exportAll()
    const name = Object.fromEntries(dump.categories.map((c) => [c.id, c.name]))
    const lines = [['Date', 'Description', 'Category', 'Type', 'Amount']]
    for (const t of [...dump.transactions].sort((a, b) => (a.date < b.date ? -1 : 1))) {
      lines.push([t.date, t.description, t.kind === 'income' ? 'Income' : name[t.category_id] || 'Uncategorized', t.kind, Number(t.amount).toFixed(2)])
    }
    download(`budget-transactions-${todayStr()}.csv`, lines.map((l) => l.map(csvCell).join(',')).join('\n'), 'text/csv')
  })
  const importJson = guard(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const dump = JSON.parse(await file.text())
    if (!Array.isArray(dump.transactions)) throw new Error('That file is not a budget backup.')
    if (!confirm(`Import ${dump.transactions.length} transactions and ${dump.categories?.length || 0} categories? They are added to what you already have.`)) return
    await db.importAll(dump); await reload(); flash('Imported')
  })

  const budgeted = sum(rows, (r) => r.budget)

  return (
    <div className="view">
      <h1 className="page-title">Settings</h1>

      <h2 className="section-title">Income</h2>
      <section className="card pad">
        <label className="field inline">
          <span>Expected monthly income</span>
          <div className="money-input">
            <span>$</span>
            <input inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value.replace(/[^0-9.]/g, ''))} onBlur={saveIncome} />
          </div>
        </label>
      </section>

      <div className="section-row">
        <h2 className="section-title">Categories</h2>
        <span className="muted small">{money(budgeted, false)}/mo budgeted</span>
      </div>
      <section className="card list">
        {rows.map((r, i) => (
          <div className="edit-row" key={r.id}>
            <input className="edit-name" value={r.name} maxLength={60}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              onBlur={() => saveRow(rows[i])} />
            <div className="money-input compact">
              <span>$</span>
              <input inputMode="decimal" value={r.budget}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, budget: e.target.value.replace(/[^0-9.]/g, '') } : x)))}
                onBlur={() => saveRow(rows[i])} />
            </div>
            <button className="icon-btn subtle" onClick={() => removeRow(r)} aria-label={`Delete ${r.name}`}><Icon name="trash" size={18} /></button>
          </div>
        ))}
        <form className="edit-row add-row" onSubmit={addRow}>
          <input className="edit-name" placeholder="New category" value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} />
          <div className="money-input compact">
            <span>$</span>
            <input inputMode="decimal" placeholder="0" value={newBudget} onChange={(e) => setNewBudget(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <button className="icon-btn accent" aria-label="Add category"><Icon name="plus" size={18} /></button>
        </form>
      </section>

      <h2 className="section-title">Your data</h2>
      <section className="card pad stack">
        <button className="btn" onClick={exportCsv}>Export transactions (CSV)</button>
        <button className="btn" onClick={exportJson}>Download full backup (JSON)</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>Restore from backup…</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
      </section>

      <h2 className="section-title">Account</h2>
      <section className="card pad stack">
        <div className="muted small">{DEMO ? 'Demo mode — data lives in this browser only.' : <>Signed in as <strong>{email}</strong></>}</div>
        <button className="btn danger" onClick={() => db.signOut()}>{DEMO ? 'Reset demo data' : 'Sign out'}</button>
      </section>
    </div>
  )
}
