-- Budget app schema. Paste this whole file into Supabase → SQL Editor → Run.
-- Every table has Row Level Security: a signed-in user can only ever see or change their own rows,
-- and signed-out visitors (the public anon key) can see nothing.

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  budget      numeric(12,2) not null default 0 check (budget >= 0),
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date         date not null default current_date,
  description  text not null default '' check (char_length(description) <= 200),
  category_id  uuid references public.categories(id) on delete set null,
  kind         text not null default 'expense' check (kind in ('expense', 'income')),
  amount       numeric(12,2) not null check (amount > 0),
  created_at   timestamptz not null default now()
);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);

create table if not exists public.settings (
  user_id          uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  expected_income  numeric(12,2) not null default 0 check (expected_income >= 0),
  updated_at       timestamptz not null default now()
);

alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.settings     enable row level security;

drop policy if exists "own categories"   on public.categories;
drop policy if exists "own transactions" on public.transactions;
drop policy if exists "own settings"     on public.settings;

create policy "own categories" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own transactions" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own settings" on public.settings
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Belt and braces: the public anon role gets no table access at all.
revoke all on public.categories, public.transactions, public.settings from anon;
