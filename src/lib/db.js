// Data layer. One API, two backends: Supabase (real) and localStorage (demo mode).
import { supabase, DEMO } from './supabase'
import { MONTHS, pad, todayStr, daysIn } from './format'

export const DEFAULT_CATEGORIES = [
  ['Groceries', 300], ['Eating Out', 150], ['Gas & Transport', 160], ['Phone', 50],
  ['Subscriptions', 40], ['School', 50], ['Fun', 100], ['Shopping', 75],
  ['Gifts', 30], ['Savings', 200], ['Other', 50],
]

// ---------------------------------------------------------------- Supabase
const must = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

const remote = {
  async getCategories() {
    return must(await supabase.from('categories').select('*').order('sort').order('created_at'))
  },
  async seedCategories() {
    const rows = DEFAULT_CATEGORIES.map(([name, budget], i) => ({ name, budget, sort: i }))
    return must(await supabase.from('categories').insert(rows).select().order('sort'))
  },
  async saveCategory(c) {
    const row = { name: c.name, budget: Number(c.budget) || 0, sort: c.sort ?? 0 }
    if (c.id) return must(await supabase.from('categories').update(row).eq('id', c.id).select().single())
    return must(await supabase.from('categories').insert(row).select().single())
  },
  async deleteCategory(id) {
    must(await supabase.from('categories').delete().eq('id', id))
  },
  async getTransactions(from, to) {
    return must(
      await supabase.from('transactions').select('*')
        .gte('date', from).lte('date', to)
        .order('date', { ascending: false }).order('created_at', { ascending: false })
        .limit(5000),
    )
  },
  async addTransaction(t) {
    return must(await supabase.from('transactions').insert(t).select().single())
  },
  async deleteTransaction(id) {
    must(await supabase.from('transactions').delete().eq('id', id))
  },
  async getSettings() {
    const data = must(await supabase.from('settings').select('*').maybeSingle())
    return data || { expected_income: 0 }
  },
  async saveSettings(s) {
    const { data: { user } } = await supabase.auth.getUser()
    return must(
      await supabase.from('settings')
        .upsert({ user_id: user.id, expected_income: Number(s.expected_income) || 0, updated_at: new Date().toISOString() })
        .select().single(),
    )
  },
  async exportAll() {
    const [categories, transactions, settings] = await Promise.all([
      remote.getCategories(), remote.getTransactions('1900-01-01', '2999-12-31'), remote.getSettings(),
    ])
    return { version: 1, exported_at: new Date().toISOString(), categories, transactions, settings }
  },
  async importAll(dump) {
    const idMap = {}
    for (const c of dump.categories || []) {
      const created = await remote.saveCategory({ name: c.name, budget: c.budget, sort: c.sort })
      idMap[c.id] = created.id
    }
    const rows = (dump.transactions || []).map((t) => ({
      date: t.date, description: t.description || '', kind: t.kind, amount: t.amount,
      category_id: t.category_id ? idMap[t.category_id] ?? null : null,
    }))
    for (let i = 0; i < rows.length; i += 500) must(await supabase.from('transactions').insert(rows.slice(i, i + 500)))
    if (dump.settings) await remote.saveSettings(dump.settings)
  },
  async askAssistant(messages, ym) {
    const { data, error } = await supabase.functions.invoke('assistant', {
      body: { messages, year: ym.y, month: ym.m },
    })
    if (error) {
      let msg = error.message
      try { msg = (await error.context.json()).error || msg } catch { /* keep default */ }
      throw new Error(msg)
    }
    return data.reply
  },
  async signOut() { await supabase.auth.signOut() },
  async userEmail() { return (await supabase.auth.getUser()).data.user?.email },
}

// ---------------------------------------------------------------- Demo (localStorage)
const LS = 'budget-demo-v1'
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))
let mem = null

function seedDemo() {
  const categories = DEFAULT_CATEGORIES.map(([name, budget], i) => ({ id: uid(), name, budget, sort: i }))
  const byName = Object.fromEntries(categories.map((c) => [c.name, c.id]))
  const now = new Date()
  const transactions = []
  const samples = [
    ['Groceries', 'Trader Joe\'s', 62.4], ['Eating Out', 'Chipotle', 13.85], ['Gas & Transport', 'Gas', 48.1],
    ['Subscriptions', 'Spotify', 11.99], ['Fun', 'Movie night', 24], ['Groceries', 'Costco', 118.32],
    ['Eating Out', 'In-N-Out', 11.2], ['Phone', 'Phone bill', 50], ['Shopping', 'Amazon', 42.99],
    ['Eating Out', 'Sushi with friends', 38.5], ['Gas & Transport', 'Gas', 51.75], ['Savings', 'Transfer to savings', 200],
    ['School', 'Textbook', 64], ['Groceries', 'Ralphs', 54.2], ['Eating Out', 'Coffee', 6.75],
  ]
  for (let back = 2; back >= 0; back--) {
    const y = new Date(now.getFullYear(), now.getMonth() - back, 1).getFullYear()
    const m = new Date(now.getFullYear(), now.getMonth() - back, 1).getMonth() + 1
    const maxDay = back === 0 ? now.getDate() : daysIn(y, m)
    const date = (d) => `${y}-${pad(m)}-${pad(Math.min(d, maxDay))}`
    transactions.push({ id: uid(), date: date(1), description: 'Paycheck', category_id: null, kind: 'income', amount: 742.5 })
    if (maxDay >= 15) transactions.push({ id: uid(), date: date(15), description: 'Paycheck', category_id: null, kind: 'income', amount: 742.5 })
    samples.forEach(([cat, desc, amt], i) => {
      const d = 1 + Math.floor((i * 29) / samples.length)
      if (d > maxDay) return
      const jitter = 1 + (((i * 7 + back * 3) % 9) - 4) / 20
      transactions.push({ id: uid(), date: date(d), description: desc, category_id: byName[cat], kind: 'expense', amount: Math.round(amt * jitter * 100) / 100 })
    })
  }
  return { categories, transactions, settings: { expected_income: 1500 } }
}

function state() {
  if (mem) return mem
  try { mem = JSON.parse(localStorage.getItem(LS)) } catch { mem = null }
  if (!mem) { mem = seedDemo(); persist() }
  return mem
}
function persist() { try { localStorage.setItem(LS, JSON.stringify(mem)) } catch { /* private mode */ } }
const sortTx = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)

const demo = {
  async getCategories() { return [...state().categories].sort((a, b) => a.sort - b.sort) },
  async seedCategories() { return demo.getCategories() },
  async saveCategory(c) {
    const s = state()
    if (c.id) { Object.assign(s.categories.find((x) => x.id === c.id), { ...c, budget: Number(c.budget) || 0 }); persist(); return c }
    const row = { id: uid(), name: c.name, budget: Number(c.budget) || 0, sort: c.sort ?? 0 }
    s.categories.push(row); persist(); return row
  },
  async deleteCategory(id) {
    const s = state()
    s.categories = s.categories.filter((c) => c.id !== id)
    s.transactions.forEach((t) => { if (t.category_id === id) t.category_id = null })
    persist()
  },
  async getTransactions(from, to) { return state().transactions.filter((t) => t.date >= from && t.date <= to).sort(sortTx) },
  async addTransaction(t) { const row = { id: uid(), ...t }; state().transactions.push(row); persist(); return row },
  async deleteTransaction(id) { const s = state(); s.transactions = s.transactions.filter((t) => t.id !== id); persist() },
  async getSettings() { return state().settings },
  async saveSettings(x) { state().settings = { expected_income: Number(x.expected_income) || 0 }; persist(); return state().settings },
  async exportAll() { return { version: 1, exported_at: new Date().toISOString(), ...state() } },
  async importAll(dump) {
    const s = state()
    s.categories.push(...(dump.categories || []))
    s.transactions.push(...(dump.transactions || []))
    if (dump.settings) s.settings = dump.settings
    persist()
  },
  async askAssistant(_messages, ym) {
    await new Promise((r) => setTimeout(r, 600))
    return `This is **demo mode**, so the assistant isn't connected yet.\n\nOnce you deploy the \`assistant\` Supabase function with your Anthropic key, Haiku will answer here using your real ${MONTHS[ym.m - 1]} data.`
  },
  async signOut() { mem = null; try { localStorage.removeItem(LS) } catch { /* ignore */ } location.reload() },
  async userEmail() { return 'demo mode' },
}

const api = DEMO ? demo : remote
export const {
  getCategories, seedCategories, saveCategory, deleteCategory, getTransactions, addTransaction,
  deleteTransaction, getSettings, saveSettings, exportAll, importAll, askAssistant, signOut, userEmail,
} = api
export { todayStr }
