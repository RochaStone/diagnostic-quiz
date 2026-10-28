-- diagnostic-quiz: one table for leads.
-- Paste this whole file into the Supabase SQL Editor and press Run. Safe to run twice.
-- Row Level Security is ON with NO policies, and the public roles get no grants,
-- so the browser key can read and write nothing. Only the server (with the secret key) can.

create table if not exists public.quiz_leads (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  quiz_version      text not null default '1',
  first_name        text not null check (char_length(first_name) between 1 and 60),
  email             text not null check (char_length(email) between 3 and 254),
  answers           jsonb not null,
  score             integer not null,
  max_score         integer not null,
  percent           integer not null check (percent between 0 and 100),
  band              text not null,
  marketing_consent boolean not null default false,
  consent_text      text,
  consented_at      timestamptz,
  ip_hash           text,
  email_status      text not null default 'pending'
);

create index if not exists quiz_leads_email_created on public.quiz_leads (email, created_at desc);
create index if not exists quiz_leads_ip_created on public.quiz_leads (ip_hash, created_at desc);
create index if not exists quiz_leads_created on public.quiz_leads (created_at desc);

alter table public.quiz_leads enable row level security;
revoke all on public.quiz_leads from anon, authenticated;

-- To remove everything later (this deletes every lead):
-- drop table public.quiz_leads;
