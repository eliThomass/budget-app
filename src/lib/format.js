export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const pad = (n) => String(n).padStart(2, '0')

const fmt2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const fmt0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export const money = (n, cents = true) => (cents ? fmt2 : fmt0).format(Number(n) || 0)

export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const daysIn = (y, m) => new Date(y, m, 0).getDate()
export const monthRange = (y, m) => [`${y}-${pad(m)}-01`, `${y}-${pad(m)}-${pad(daysIn(y, m))}`]
export const yearRange = (y) => [`${y}-01-01`, `${y}-12-31`]

export const prettyDate = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export const shiftMonth = ({ y, m }, delta) => {
  const d = new Date(y, m - 1 + delta, 1)
  return { y: d.getFullYear(), m: d.getMonth() + 1 }
}

export const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0)
