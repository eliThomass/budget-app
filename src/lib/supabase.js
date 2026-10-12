import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// With no Supabase settings the app runs in demo mode: sample data, stored only in this browser.
export const DEMO = !url || !key

export const supabase = DEMO
  ? null
  : createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
