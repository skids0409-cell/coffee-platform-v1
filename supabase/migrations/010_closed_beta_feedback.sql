-- Coffee Platform V1 — structured closed-beta feedback
-- Version: 1.0.0 | Date: 2026-08-09
begin;

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique check (public_reference ~ '^BF-[A-Z0-9]{12}$'),
  page_path text not null check (page_path ~ '^/' and char_length(page_path) <= 500),
  task_code text not null check (task_code in ('discover','filter','compare','finder','offer','directory','search','admin','other')),
  outcome text not null check (outcome in ('success','partial','failed')),
  device_type text not null check (device_type in ('android','iphone','desktop','tablet','other')),
  duration_seconds integer check (duration_seconds between 0 and 14400),
  severity text not null check (severity in ('p0','p1','p2','p3','none')),
  feedback_text text not null check (char_length(feedback_text) between 10 and 4000),
  consent boolean not null check (consent),
  status text not null default 'new' check (status in ('new','triaged','in_progress','resolved','duplicate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beta_feedback_status_created_idx on public.beta_feedback(status, created_at desc);
alter table public.beta_feedback enable row level security;
grant insert on public.beta_feedback to anon, authenticated;
grant select, update on public.beta_feedback to authenticated;

drop policy if exists beta_feedback_public_insert on public.beta_feedback;
create policy beta_feedback_public_insert on public.beta_feedback for insert to anon, authenticated
  with check (consent = true and status = 'new' and char_length(feedback_text) between 10 and 4000 and page_path ~ '^/');
drop policy if exists beta_feedback_staff_read on public.beta_feedback;
create policy beta_feedback_staff_read on public.beta_feedback for select to authenticated using ((select private.is_staff()));
drop policy if exists beta_feedback_staff_update on public.beta_feedback;
create policy beta_feedback_staff_update on public.beta_feedback for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

commit;
select to_regclass('public.beta_feedback') as beta_feedback_table;
