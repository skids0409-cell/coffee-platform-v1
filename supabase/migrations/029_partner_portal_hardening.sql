drop policy if exists partner_submissions_member_update on public.partner_submissions;
create policy partner_submissions_member_update on public.partner_submissions
for update to authenticated
using (
  submitted_by=(select auth.uid())
  and status in ('draft','needs_changes')
  and exists(select 1 from public.organization_memberships m where m.organization_id=partner_submissions.organization_id and m.user_id=(select auth.uid()) and m.status='active')
)
with check (
  submitted_by=(select auth.uid())
  and status in ('draft','submitted')
  and exists(select 1 from public.organization_memberships m where m.organization_id=partner_submissions.organization_id and m.user_id=(select auth.uid()) and m.status='active')
);

drop trigger if exists organization_memberships_set_updated_at on public.organization_memberships;
create trigger organization_memberships_set_updated_at before update on public.organization_memberships
for each row execute function private.set_updated_at();
drop trigger if exists partner_submissions_set_updated_at on public.partner_submissions;
create trigger partner_submissions_set_updated_at before update on public.partner_submissions
for each row execute function private.set_updated_at();

create or replace function private.prevent_partner_submission_identity_change()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.submitted_by <> old.submitted_by or new.organization_id <> old.organization_id or new.idempotency_key <> old.idempotency_key or new.entity_type <> old.entity_type then
    raise exception 'immutable_submission_identity' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.prevent_partner_submission_identity_change() from public;
drop trigger if exists partner_submission_identity_immutable on public.partner_submissions;
create trigger partner_submission_identity_immutable before update on public.partner_submissions
for each row execute function private.prevent_partner_submission_identity_change();
