import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setErr(error.message)
    setBusy(false)
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">
          <svg viewBox="0 0 64 64" width="56" height="56"><rect width="64" height="64" rx="16" fill="#1E3A5F"/><rect x="14" y="34" width="9" height="16" rx="3" fill="#7FD8CB"/><rect x="27.5" y="25" width="9" height="25" rx="3" fill="#3CC0AE"/><rect x="41" y="16" width="9" height="34" rx="3" fill="#fff"/></svg>
        </div>
        <h1>Budget</h1>
        <p className="muted">Private app. Sign in to continue.</p>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {err && <div className="form-error">{err}</div>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
