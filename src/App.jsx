import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, DEMO } from './lib/supabase'
import * as db from './lib/db'
import Login from './views/Login.jsx'
import MonthView from './views/MonthView.jsx'
import AddView from './views/AddView.jsx'
import YearView from './views/YearView.jsx'
import Assistant from './views/Assistant.jsx'
import Settings from './views/Settings.jsx'
import { Icon } from './views/ui.jsx'

export default function App() {
  const [session, setSession] = useState(DEMO ? { demo: true } : undefined)

  useEffect(() => {
    if (DEMO) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="splash"><div className="spinner" /></div>
  if (!session) return <Login />
  return <Main />
}

const TABS = [
  ['month', 'Month', 'home'],
  ['year', 'Year', 'chart'],
  ['add', 'Add', 'plus'],
  ['ai', 'Assistant', 'spark'],
  ['settings', 'Settings', 'gear'],
]

function Main() {
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const [tab, setTab] = useState('month')
  const [cats, setCats] = useState(null)
  const [settings, setSettings] = useState({ expected_income: 0 })
  const [rev, setRev] = useState(0)
  const [toast, setToast] = useState('')
  const [err, setErr] = useState('')
  const seeding = useRef(false)

  const loadMeta = useCallback(async () => {
    let c = await db.getCategories()
    if (c.length === 0 && !seeding.current) {
      seeding.current = true
      c = await db.seedCategories()
    }
    setCats(c)
    setSettings(await db.getSettings())
  }, [])

  useEffect(() => { loadMeta().catch((e) => setErr(e.message)) }, [loadMeta])

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200) }
  const changed = () => setRev((r) => r + 1)

  if (err) return <div className="app"><div className="card error">Couldn't load your data: {err}</div></div>
  if (!cats) return <div className="splash"><div className="spinner" /></div>

  return (
    <>
      {DEMO && <div className="demo-banner">Demo mode · sample data in this browser only</div>}
      <main className="app">
        {tab === 'month' && <MonthView cats={cats} settings={settings} ym={ym} setYm={setYm} rev={rev} onChanged={changed} />}
        {tab === 'year' && <YearView cats={cats} initialYear={ym.y} rev={rev} />}
        {tab === 'add' && (
          <AddView
            cats={cats}
            onSaved={(t) => {
              changed()
              const [y, m] = t.date.split('-').map(Number)
              setYm({ y, m })
              setTab('month')
              flash(t.kind === 'income' ? 'Income added' : 'Expense added')
            }}
          />
        )}
        {tab === 'ai' && <Assistant ym={ym} />}
        {tab === 'settings' && (
          <Settings cats={cats} settings={settings} reload={() => loadMeta().then(changed)} flash={flash} />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}

      <nav className="tabbar">
        {TABS.map(([id, label, icon]) => (
          <button
            key={id}
            className={`tab ${tab === id ? 'active' : ''} ${id === 'add' ? 'tab-add' : ''}`}
            onClick={() => setTab(id)}
            aria-label={label}
          >
            <span className="tab-icon"><Icon name={icon} /></span>
            {id !== 'add' && <span className="tab-label">{label}</span>}
          </button>
        ))}
      </nav>
    </>
  )
}
