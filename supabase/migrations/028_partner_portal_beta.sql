create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null check (member_role in ('owner','manager','editor')),
  status text not null default 'pending' check (status in ('pending','active','suspended','revoked')),
  approved_by uuid references public.profiles(id) on delete set null, approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,user_id)
);
create table if not exists public.partner_submissions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('organization_update','location','product_offer','new_product')),
  target_entity_id uuid, payload jsonb not null default '{}'::jsonb,
  idempotency_key uuid not null, client_updated_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','submitted','in_review','needs_changes','approved','rejected','archived')),
  review_note text, reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(submitted_by,idempotency_key)
);
create index if not exists organization_memberships_user_status_idx on public.organization_memberships(user_id,status);
create index if not exists partner_submissions_org_status_idx on public.partner_submissions(organization_id,status,updated_at desc);
alter table public.organization_memberships enable row level security;
alter table public.partner_submissions enable row level security;
drop policy if exists memberships_staff_all on public.organization_memberships;
create policy memberships_staff_all on public.organization_memberships for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
drop policy if exists memberships_owner_read on public.organization_memberships;
create policy memberships_owner_read on public.organization_memberships for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists partner_submissions_staff_all on public.partner_submissions;
create policy partner_submissions_staff_all on public.partner_submissions for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
drop policy if exists partner_submissions_member_read on public.partner_submissions;
create policy partner_submissions_member_read on public.partner_submissions for select to authenticated using (submitted_by=(select auth.uid()) and exists(select 1 from public.organization_memberships m where m.organization_id=partner_submissions.organization_id and m.user_id=(select auth.uid()) and m.status='active'));
drop policy if exists partner_submissions_member_insert on public.partner_submissions;
create policy partner_submissions_member_insert on public.partner_submissions for insert to authenticated with check (submitted_by=(select auth.uid()) and status in ('draft','submitted') and exists(select 1 from public.organization_memberships m where m.organization_id=partner_submissions.organization_id and m.user_id=(select auth.uid()) and m.status='active'));
drop policy if exists partner_submissions_member_update on public.partner_submissions;
create policy partner_submissions_member_update on public.partner_submissions for update to authenticated using (submitted_by=(select auth.uid()) and status in ('draft','needs_changes')) with check (submitted_by=(select auth.uid()) and status in ('draft','submitted'));
grant select on public.organization_memberships to authenticated;
grant select,insert,update on public.partner_submissions to authenticated;
