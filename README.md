# Budget

A private budgeting PWA: React + Vite on GitHub Pages, Supabase for storage and login, and Claude Haiku as a built-in assistant.

- **Month:** what's left, spending against each category's budget, and every transaction
- **Add:** quick add for expenses or income, built for a phone
- **Year:** income vs spending by month, plus a category × month heatmap
- **Assistant:** chat with Haiku about your real numbers (summaries, overspending, planning)
- **Settings:** categories, budgets, expected income, CSV export, JSON backup and restore

## How it stays private

| Layer | What protects it |
|---|---|
| Accounts | Sign-ups are **turned off** in Supabase. The only account is the one you create by hand. |
| Database | Row Level Security on every table: rows are readable and writable only by the account that owns them. Signed-out visitors get nothing. |
| AI key | Your Anthropic key is a **Supabase secret** used only inside the `assistant` edge function. It never reaches the website or GitHub. |
| AI access | The function checks that the caller is signed in **and** that their email matches `ALLOWED_EMAIL`. |

The Supabase URL and anon (publishable) key are in the built site. That's normal and safe: those keys are designed to be public, and RLS decides what they can do.

## Try it locally first (demo mode)

```bash
npm install
npm run dev
```

With no Supabase settings, the app runs in **demo mode** with sample data saved in your browser, so you can poke around before setting anything up.

## Setup

### 1. Supabase project
1. Create a project at [supabase.com](https://supabase.com) (the free tier is plenty).
2. **SQL Editor:** paste in `supabase/migrations/001_init.sql` and click **Run**.
3. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up". Keep Email enabled.
4. **Authentication → Users → Add user → Create new user:** enter your email and a strong password, and check **Auto confirm user**.
5. **Project Settings → API:** copy the **Project URL** and the **anon / publishable** key.

### 2. AI assistant (edge function)
Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from this folder:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... ALLOWED_EMAIL=you@example.com
# optional: lock CORS to your site
supabase secrets set ALLOWED_ORIGIN=https://YOUR_GITHUB_USERNAME.github.io
supabase functions deploy assistant
```

Get an API key at [console.anthropic.com](https://console.anthropic.com), and **set a monthly spend limit** there. Haiku is cheap, but a cap costs nothing.
The model defaults to `claude-haiku-5-5`. To change it, run `supabase secrets set ANTHROPIC_MODEL=...`.

### 3. GitHub Pages
1. Push this folder to a new GitHub repo on the `main` branch.
2. **Settings → Secrets and variables → Actions → Secrets tab**, then add these repository secrets:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon / publishable key
3. **Settings → Pages → Source:** choose **GitHub Actions**.
4. Push again, or run the workflow from the Actions tab. The site goes live at `https://YOUR_GITHUB_USERNAME.github.io/REPO_NAME/`.

### 4. Put it on your iPhone
Open the site in **Safari → Share → Add to Home Screen**. It launches full screen with its own icon. Sign in once inside the home screen app; it keeps its own login, separate from Safari.

## Local development against Supabase
Copy `.env.example` to `.env.local`, fill in both values, then run `npm run dev`.

## Project layout
```
src/
  App.jsx            auth gate, tabs, shared state
  lib/db.js          data layer (Supabase + demo/localStorage)
  views/             Month, Add, Year, Assistant, Settings, Login
supabase/
  migrations/001_init.sql        tables + Row Level Security
  functions/assistant/index.ts   Haiku proxy with owner check
.github/workflows/deploy.yml     build + deploy to Pages
```

## Ideas for later
- Recurring transactions (rent, subscriptions)
- Edit existing transactions
- Per-month budget overrides
- Streaming assistant replies
- Let the assistant add transactions from plain English ("spent 14 at Chipotle")
