-- Coffee Platform V1 — coffee origin draft/review workflow
-- Version: 1.0.0 | Date: 2026-08-18
begin;

alter table public.origin_claims add column if not exists status public.publication_status not null default 'draft';
update public.origin_claims oc set status='published'
where exists(select 1 from public.products p where p.id=oc.product_id and p.status='published')
  and oc.status='draft';
create index if not exists origin_claims_status_product_idx on public.origin_claims(status,product_id);

drop policy if exists origin_claims_public_read on public.origin_claims;
create policy origin_claims_public_read on public.origin_claims for select to anon,authenticated
using (
  status='published'
  and exists(select 1 from public.products p where p.id=product_id and p.status='published')
);

commit;
