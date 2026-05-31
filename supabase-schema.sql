-- FollowBoss Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Subscriptions ────────────────────────────────────────
create table if not exists subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan text not null default 'trial', -- trial, mensuel, fondateurs, annuel
  status text not null default 'active', -- active, cancelled, expired
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- ── Follow-Ups ───────────────────────────────────────────
create table if not exists follow_ups (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  client_name text not null,
  client_email text not null default '',
  client_phone text,
  type text not null default 'relance_generale',
  subject text not null default '',
  amount numeric,
  status text not null default 'pending',
  priority text not null default 'moyenne',
  last_follow_up_at timestamptz,
  next_follow_up_at timestamptz,
  follow_up_count integer not null default 0,
  max_follow_ups integer not null default 5,
  notes text,
  created_at timestamptz default now()
);

-- ── Follow-Up Events ─────────────────────────────────────
create table if not exists follow_up_events (
  id uuid default uuid_generate_v4() primary key,
  follow_up_id uuid references follow_ups(id) on delete cascade not null,
  event_date timestamptz not null default now(),
  action text not null,
  result text,
  note text,
  created_at timestamptz default now()
);

-- ── Appointments ─────────────────────────────────────────
create table if not exists appointments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  client_name text not null,
  client_email text,
  client_phone text,
  date text not null,
  time text not null,
  duration integer not null default 30,
  subject text not null default '',
  location text,
  notes text,
  reminded boolean not null default false,
  created_at timestamptz default now()
);

-- ── Invoices ─────────────────────────────────────────────
create table if not exists invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  client_name text not null,
  client_email text not null default '',
  client_phone text,
  invoice_number text not null,
  amount numeric not null default 0,
  issued_at text not null,
  due_date text not null,
  status text not null default 'pending',
  notes text,
  created_at timestamptz default now()
);

-- ── Prospects ────────────────────────────────────────────
create table if not exists prospects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  email text not null default '',
  phone text,
  company text,
  source text not null default 'Web',
  stage text not null default 'nouveau',
  estimated_value numeric,
  notes text,
  last_contact_at timestamptz,
  created_at timestamptz default now()
);

-- ══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — Each user sees ONLY their own data
-- ══════════════════════════════════════════════════════════

alter table subscriptions enable row level security;
alter table follow_ups enable row level security;
alter table follow_up_events enable row level security;
alter table appointments enable row level security;
alter table invoices enable row level security;
alter table prospects enable row level security;

-- Subscriptions: user can read their own
create policy "Users read own subscription" on subscriptions for select using (auth.uid() = user_id);
create policy "Users insert own subscription" on subscriptions for insert with check (auth.uid() = user_id);

-- Follow-ups: full CRUD for own data
create policy "Users CRUD own follow_ups" on follow_ups for all using (auth.uid() = user_id);

-- Follow-up events: access via follow_up ownership
create policy "Users CRUD own follow_up_events" on follow_up_events for all
  using (exists (select 1 from follow_ups where follow_ups.id = follow_up_events.follow_up_id and follow_ups.user_id = auth.uid()));

-- Appointments: full CRUD for own data
create policy "Users CRUD own appointments" on appointments for all using (auth.uid() = user_id);

-- Invoices: full CRUD for own data
create policy "Users CRUD own invoices" on invoices for all using (auth.uid() = user_id);

-- Prospects: full CRUD for own data
create policy "Users CRUD own prospects" on prospects for all using (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────────────
create index if not exists idx_follow_ups_user on follow_ups(user_id);
create index if not exists idx_appointments_user on appointments(user_id);
create index if not exists idx_invoices_user on invoices(user_id);
create index if not exists idx_prospects_user on prospects(user_id);
create index if not exists idx_follow_up_events_fup on follow_up_events(follow_up_id);

