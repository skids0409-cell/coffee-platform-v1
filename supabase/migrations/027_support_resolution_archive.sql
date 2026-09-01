-- Support resolution handoff, customer contact, and governed archive
begin;

alter table public.support_requests add column if not exists requester_name text;
alter table public.support_requests add column if not exists requester_phone text;
alter table public.support_requests add column if not exists requester_email text;
alter table public.support_requests add column if not exists escalated_at timestamptz;
alter table public.support_requests add column if not exists customer_replied_at timestamptz;
alter table public.support_requests add column if not exists archived_at timestamptz;

alter table public.support_requests drop constraint if exists support_requests_status_check;
alter table public.support_requests add constraint support_requests_status_check
  check (status in ('new','triaged','in_progress','waiting_user','resolved','closed','spam','archived'));

grant delete on public.support_requests to authenticated;
drop policy if exists support_requests_admin_delete on public.support_requests;
create policy support_requests_admin_delete
  on public.support_requests for delete to authenticated
  using ((select private.is_staff(array['admin']::public.staff_role[])));

create index if not exists support_requests_archive_idx
  on public.support_requests(archived_at desc) where status='archived';

commit;
