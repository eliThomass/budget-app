import { useEffect, useMemo, useState } from 'react'
import * as db from '../lib/db'
import { MONTHS, money, yearRange } from '../lib/format'
import { Icon } from './ui.jsx'

export default function YearView({ cats, initialYear, rev }) {
  const [y, setY] = useState(initialYear)
  const [tx, setTx] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let live = true
    setTx(null)
    const [a, b] = yearRange(y)
    db.getTransactions(a, b).then((r) => live && setTx(r)).catch((e) => setErr(e.message))
    return () => { live = false }
  }, [y, rev])

  const d = useMemo(() => {
    const income = Array(12).fill(0), spent = Array(12).fill(0), grid = {}
    for (const t of tx || []) {
      const m = Number(t.date.slice(5, 7)) - 1
      const amt = Number(t.amount)
      if (t.kind === 'income') { income[m] += amt; continue }
      spent[m] += amt
      const k = t.category_id ?? 'none'
      grid[k] = grid[k] || Array(12).fill(0)
      grid[k][m] += amt
    }
    const totIncome = income.reduce((a, b) => a + b, 0)
    const totSpent = spent.reduce((a, b) => a + b, 0)
    const active = spent.filter((v, i) => v > 0 || income[i] > 0).length || 1
    const peak = Math.max(1, ...income, ...spent)
    const cellMax = Math.max(1, ...Object.values(grid).flat())
    return { income, spent, grid, totIncome, totSpent, active, peak, cellMax }
  }, [tx])

  const rows = [...cats.map((c) => ({ id: c.id, name: c.name, budget: Number(c.budget) || 0 }))]
  if (d.grid.none) rows.push({ id: 'none', name: 'Uncategorized', budget: 0 })

  return (
    <div className="view">
      <div className="picker">
        <button className="icon-btn" onClick={() => setY(y - 1)} aria-label="Previous year"><Icon name="left" /></button>
        <div className="picker-label"><span className="picker-main">{y}</span><span className="picker-sub">Year overview</span></div>
        <button className="icon-btn" onClick={() => setY(y + 1)} aria-label="Next year"><Icon name="right" /></button>
      </div>
      {err && <div className="card error">{err}</div>}

      <section className="stats3">
        <div className="stat"><span>Income</span><strong className="pos">{money(d.totIncome, false)}</strong></div>
        <div className="stat"><span>Spent</span><strong>{money(d.totSpent, false)}</strong></div>
        <div className="stat"><span>Net</span><strong className={d.totIncome - d.totSpent < 0 ? 'neg' : 'pos'}>{money(d.totIncome - d.totSpent, false)}</strong></div>
      </section>

      <section className="card">
        <div className="chart-head">
          <h2 className="section-title flush">Income vs spending</h2>
          <div className="legend"><i className="lg-in" />Income <i className="lg-out" />Spent</div>
        </div>
        <div className="bars12">
          {MONTHS.map((m, i) => (
            <div className="bars12-col" key={m} title={`${m}: ${money(d.income[i])} in, ${money(d.spent[i])} spent`}>
              <div className="bars12-pair">
                <div className="b-in" style={{ height: `${(d.income[i] / d.peak) * 100}%` }} />
                <div className="b-out" style={{ height: `${(d.spent[i] / d.peak) * 100}%` }} />
              </div>
              <span>{m[0]}</span>
            </div>
          ))}
        </div>
      </section>

      <h2 className="section-title">By category</h2>
      <section className="card table-wrap">
        {tx === null ? <div className="empty"><div className="spinner small" /></div> : (
          <table className="year-table">
            <thead>
              <tr>
                <th className="sticky">Category</th>
                {MONTHS.map((m) => <th key={m}>{m.slice(0, 3)}</th>)}
                <th>Total</th><th>Avg/mo</th><th>vs budget</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const vals = d.grid[r.id] || Array(12).fill(0)
                const total = vals.reduce((a, b) => a + b, 0)
                const diff = r.budget * d.active - total
                return (
                  <tr key={r.id}>
                    <td className="sticky">{r.name}</td>
                    {vals.map((v, i) => (
                      <td key={i} style={{ '--heat': v > 0 ? 0.08 + 0.5 * (v / d.cellMax) : 0 }} className="heat">
                        {v ? money(v, false) : '–'}
                      </td>
                    ))}
                    <td className="strong">{money(total, false)}</td>
                    <td>{money(total / d.active, false)}</td>
                    <td className={diff < 0 ? 'neg' : 'pos'}>{r.budget ? (diff < 0 ? '−' : '+') + money(Math.abs(diff), false) : '–'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr><td className="sticky">Spent</td>{d.spent.map((v, i) => <td key={i}>{v ? money(v, false) : '–'}</td>)}<td>{money(d.totSpent, false)}</td><td>{money(d.totSpent / d.active, false)}</td><td /></tr>
              <tr><td className="sticky">Income</td>{d.income.map((v, i) => <td key={i} className="pos">{v ? money(v, false) : '–'}</td>)}<td className="pos">{money(d.totIncome, false)}</td><td>{money(d.totIncome / d.active, false)}</td><td /></tr>
              <tr className="net"><td className="sticky">Net</td>{d.income.map((v, i) => { const n = v - d.spent[i]; return <td key={i} className={n < 0 ? 'neg' : ''}>{v || d.spent[i] ? money(n, false) : '–'}</td> })}<td className={d.totIncome - d.totSpent < 0 ? 'neg' : ''}>{money(d.totIncome - d.totSpent, false)}</td><td /><td /></tr>
            </tfoot>
          </table>
        )}
      </section>
      <p className="hint">"vs budget" compares against your monthly budget × the {d.active} month{d.active === 1 ? '' : 's'} with activity.</p>
    </div>
  )
}
