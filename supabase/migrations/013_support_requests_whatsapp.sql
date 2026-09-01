-- Coffee Platform V1 — help, support and WhatsApp handoff
-- Version: 1.0.0 | Date: 2026-08-10
begin;

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique check (public_reference ~ '^SR-[A-Z0-9]{12}$'),
  request_type text not null check (request_type in ('platform_issue','incorrect_information','missing_listing','search_issue','suggestion','business','other')),
  page_path text not null check (page_path ~ '^/' and char_length(page_path) <= 500),
  subject text not null check (char_length(subject) between 4 and 160),
  message text not null check (char_length(message) between 10 and 4000),
  preferred_channel text not null default 'whatsapp' check (preferred_channel in ('whatsapp','platform')),
  consent boolean not null check (consent),
  status text not null default 'new' check (status in ('new','triaged','in_progress','waiting_user','resolved','closed','spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_requests_status_created_idx
  on public.support_requests(status, created_at desc);

drop trigger if exists set_support_requests_updated_at on public.support_requests;
create trigger set_support_requests_updated_at
  before update on public.support_requests
  for each row execute function private.set_updated_at();

alter table public.support_requests enable row level security;

grant insert on public.support_requests to anon, authenticated;
grant select, update on public.support_requests to authenticated;

drop policy if exists support_requests_public_insert on public.support_requests;
create policy support_requests_public_insert
  on public.support_requests for insert to anon, authenticated
  with check (
    consent = true
    and status = 'new'
    and page_path ~ '^/'
    and char_length(subject) between 4 and 160
    and char_length(message) between 10 and 4000
  );

drop policy if exists support_requests_staff_read on public.support_requests;
create policy support_requests_staff_read
  on public.support_requests for select to authenticated
  using ((select private.is_staff()));

drop policy if exists support_requests_staff_update on public.support_requests;
create policy support_requests_staff_update
  on public.support_requests for update to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

commit;

select to_regclass('public.support_requests') as support_requests_table;
